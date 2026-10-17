import Foundation

@MainActor final class NotificationCoordinator: NotificationExecuting {
  var onObservation: ((String) -> Void)?
  private let sdk: any NotificationSDK
  private let authority: any NotificationSessionAuthority
  private let transport: any SessionAuthorizedTransport
  private let clock: any NotificationClock
  private let permission: NotificationPermissionAdapter
  private let configured: Bool
  private var lease: String?
  private var generation = -1
  private var desired: NotificationSessionContext?
  private var epoch = 0
  private var revision = 0
  private var installation: NotificationInstallation?
  private var setup: (id: UUID, epoch: Int, task: Task<Bool, Never>)?
  private var nextGrantAt = 0.0
  private var jwtRefreshConsumed = false
  private var jwtInvalidationRevision = 0
  private var signedBindingValid = false
  private var removeAuthorityObserver: (() -> Void)?
  private var highestAttempt = 0

  init(sdk: any NotificationSDK, authority: any NotificationSessionAuthority, transport: any SessionAuthorizedTransport, clock: any NotificationClock, appId: String?) {
    self.sdk = sdk; self.authority = authority; self.transport = transport; self.clock = clock
    permission = NotificationPermissionAdapter(platform: sdk)
    configured = appId.flatMap(UUID.init(uuidString:)) != nil
    if configured, let appId {
      sdk.initialize(appId: appId)
      sdk.setForegroundAllowed(false)
      sdk.logout()
      installation = sdk.installation
    }
    sdk.onChanged = { [weak self] in self?.changed() }
    sdk.onJwtInvalidated = { [weak self] account in
      guard let self, let context = self.desired, context.accountId == account,
            self.sdk.installation.externalId == account else { return }
      self.jwtInvalidationRevision += 1
      self.signedBindingValid = false
      self.revision += 1
      self.changed()
      guard !self.jwtRefreshConsumed else { return }
      self.jwtRefreshConsumed = true
      Task { @MainActor [weak self] in _ = await self?.bind(context) }
    }
    removeAuthorityObserver = authority.observeInvalidation { [weak self] in self?.suspend() }
  }

  func execute(command: String, payload: String) async -> String {
    guard let request = NotificationWire.decode(command, payload) else { return NotificationWire.error("invalid-request") }
    if command == "acquire" {
      if lease != request.lease {
        suspend(); lease = request.lease; generation = -1; highestAttempt = 0
      }
      return observation()
    }
    guard lease == request.lease else { return error("stale", request) }
    if command == "release" {
      let result = observation(); suspend(); lease = nil
      return result
    }
    guard configured else { return error("unavailable", request) }
    if command == "reconcile" {
      guard request.generation >= generation,
            request.generation != generation || request.context == desired else { return error("stale", request) }
      if request.context != desired || request.generation != generation {
        suspend(); generation = request.generation; desired = request.context
      }
      if clock.milliseconds >= nextGrantAt { jwtRefreshConsumed = false }
      guard let context = request.context else { return observation() }
      guard authority.capture(context) != nil else { suspend(); return error("unavailable", request) }
      guard await bind(context) else { return error("unavailable", request) }
      return observation()
    }
    guard let context = request.context, desired == context, request.generation == generation,
          authority.capture(context) != nil else { return error("stale", request) }
    let capturedEpoch = epoch
    switch command {
    case "enable":
      let result = await permission.enable()
      guard current(context, capturedEpoch) else { return error("stale", request) }
      if result.permission == .allowed {
        do { try await sdk.optIn() } catch { return self.error("unavailable", request) }
        guard current(context, capturedEpoch) else { return error("stale", request) }
      }
      changed()
      _ = await bind(context)
      return observation()
    case "openSettings":
      await permission.openSettings()
      guard current(context, capturedEpoch) else { return error("stale", request) }
      return observation()
    case "refresh": return await readiness(request, context)
    default: return error("invalid-request", request)
    }
  }

  private func current(_ context: NotificationSessionContext, _ capturedEpoch: Int) -> Bool {
    epoch == capturedEpoch && desired == context && authority.capture(context) != nil
  }
  func foregroundAuthorized() -> Bool {
    guard configured, signedBindingValid, let desired, authority.capture(desired) != nil else { return false }
    return sdk.installation.externalId == desired.accountId
  }
  private func suspend() {
    epoch += 1; desired = nil; setup?.task.cancel(); setup = nil
    signedBindingValid = false
    if configured { sdk.setForegroundAllowed(false); sdk.logout() }
    changed()
  }
  private func changed() {
    guard configured else { return }
    let next = sdk.installation
    if next != installation { revision += 1; installation = next }
    let allowed = signedBindingValid && (desired.map { authority.capture($0) != nil && next.externalId == $0.accountId } ?? false)
    sdk.setForegroundAllowed(allowed)
    if lease != nil { onObservation?(observation()) }
  }
  private func bind(_ context: NotificationSessionContext) async -> Bool {
    let capturedEpoch = epoch
    if let setup, setup.epoch == capturedEpoch { return await setup.task.value }
    guard current(context, capturedEpoch), clock.milliseconds >= nextGrantAt else { return false }
    if signedBindingValid { signedBindingValid = false; revision += 1; changed() }
    let capturedJwtRevision = jwtInvalidationRevision
    let setupId = UUID()
    let task = Task { @MainActor [self] in
      defer { if setup?.id == setupId { setup = nil } }
      let response = await transport.execute(context: context, operation: .identityGrant)
      guard current(context, capturedEpoch), jwtInvalidationRevision == capturedJwtRevision else { return false }
      guard case .response(let status, let data) = response,
            let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return false }
      if status != 200 {
        if let retry = NotificationWire.integer(body["retryAfterSeconds"]), (1...60).contains(retry) {
          nextGrantAt = clock.milliseconds + Double(retry * 1000)
        }
        return false
      }
      guard Set(body.keys) == ["externalId", "token", "expiresAt"],
            body["externalId"] as? String == context.accountId,
            let token = NotificationWire.string(body["token"]),
            let expires = NotificationWire.date(body["expiresAt"]), expires.timeIntervalSince(clock.date) >= 15 else { return false }
      sdk.login(accountId: context.accountId, token: token)
      signedBindingValid = true
      jwtRefreshConsumed = false
      changed()
      return true
    }
    setup = (setupId, capturedEpoch, task)
    return await task.value
  }
  private func observation() -> String {
    let snapshot = configured ? sdk.installation : nil
    let normalized = snapshot.map { NotificationPermissionAdapter.normalize($0.permission) } ?? .init(permission: .unavailable, canRequest: false)
    return NotificationWire.encode(["version": 1, "kind": "observation", "rootLease": lease ?? "invalid", "generation": max(0, generation), "revision": revision,
      "permission": normalized.permission.rawValue, "canRequest": normalized.canRequest,
      "registrationPresent": snapshot?.subscriptionId.flatMap(UUID.init(uuidString:)) != nil && snapshot?.token?.isEmpty == false,
      "enabled": snapshot?.optedIn == true && normalized.permission == .allowed,
      "matchesCurrentAccount": signedBindingValid && (desired.map { snapshot?.externalId == $0.accountId && authority.capture($0) != nil } ?? false)])
  }
  private func error(_ code: String, _ request: NotificationRequest) -> String {
    NotificationWire.error(code, lease: request.lease, generation: request.generation)
  }
  private func readiness(_ request: NotificationRequest, _ context: NotificationSessionContext) async -> String {
    guard let attemptId = request.attemptId, let sequence = NotificationWire.sequence(attemptId), let expectedRevision = request.revision,
          expectedRevision == revision, sequence > highestAttempt else { return error("stale", request) }
    highestAttempt = sequence
    let capturedEpoch = epoch
    let snapshot = sdk.installation
    let normalized = NotificationPermissionAdapter.normalize(snapshot.permission)
    var result: [String: Any] = ["version": 1, "kind": "readiness", "rootLease": request.lease, "generation": request.generation,
      "revision": expectedRevision, "attemptId": attemptId, "status": "pending", "remainingValidityMs": 0]
    guard signedBindingValid, normalized.permission == .allowed, snapshot.optedIn, snapshot.externalId == context.accountId,
          let subscriptionId = snapshot.subscriptionId, UUID(uuidString: subscriptionId) != nil,
          snapshot.token?.isEmpty == false else { return NotificationWire.encode(result) }
    let started = clock.milliseconds
    let response = await transport.execute(context: context, operation: .readiness(subscriptionId: subscriptionId, platform: "ios"))
    changed()
    guard current(context, capturedEpoch), revision == expectedRevision else { return error("stale", request) }
    guard case .response(let status, let data) = response,
          let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
      result["status"] = "unavailable"; return NotificationWire.encode(result)
    }
    if status != 200 {
      result["status"] = status == 401 ? "unauthorized" : status == 429 ? "rate-limited" : "unavailable"
      if let retry = NotificationWire.integer(body["retryAfterSeconds"]), (1...60).contains(retry) { result["retryAfterSeconds"] = retry }
    } else if Set(body.keys) == ["status", "checkedAt", "validForSeconds"], NotificationWire.date(body["checkedAt"]) != nil {
      if body["status"] as? String == "ready", NotificationWire.integer(body["validForSeconds"]) == 60 {
        let remaining = max(0, Int((started + 60000 - clock.milliseconds).rounded(.down)))
        result["status"] = remaining > 0 ? "ready" : "pending"
        result["remainingValidityMs"] = min(60000, remaining)
      } else if body["status"] as? String != "pending" || NotificationWire.integer(body["validForSeconds"]) != 0 { result["status"] = "unavailable" }
    } else { result["status"] = "unavailable" }
    return NotificationWire.encode(result)
  }
}
