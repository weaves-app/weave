import Foundation

@MainActor
final class ClerkAuthService: WeaveAuthExecuting {
  var onSnapshot: ((String) -> Void)?
  private struct Attempt {
    let providerId: String
    let purpose: String
  }
  private let provider: any AuthProvider
  private var attempts: [String: Attempt] = [:]
  private var generation = -1
  private var revision = 0
  private var epoch = 0
  private var obsoleteSessions: Set<String> = []
  private var eventsEnabled = true
  private var hasActiveSnapshot = false
  private var pendingSignOuts: Set<Int> = []
  private var pendingAuthentications: Set<Int> = []

  init(provider: any AuthProvider) {
    self.provider = provider
    provider.invalidationHandler = { [weak self] in
      guard let self, self.eventsEnabled, self.hasActiveSnapshot, self.generation >= 0 else { return }
      if self.pendingSignOuts.isEmpty { self.epoch += 1 }
      self.attempts.removeAll()
      _ = self.snapshot(status: "signedOut")
    }
  }

  func execute(command: String, payload: String) async -> String {
    guard let data = payload.data(using: .utf8),
          let inputs = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
      return error(.invalidInput)
    }
    if command == "dispose" {
      eventsEnabled = false
      epoch += 1
      attempts.removeAll()
      provider.abandonAttempts()
      return error(.cancelled)
    }
    guard let nextGeneration = inputs["generation"] as? Int,
          nextGeneration >= 0,
          let operationId = inputs["operationId"] as? String, !operationId.isEmpty else {
      return error(.invalidInput)
    }
    guard nextGeneration >= generation else { return error(.cancelled) }
    generation = nextGeneration
    eventsEnabled = true
    epoch += 1
    let operationEpoch = epoch
    if command == "abandon" {
      attempts.removeAll()
      provider.abandonAttempts()
      return error(.cancelled)
    }
    let mayActivate = ["password", "requestCode", "verifyCode", "resendCode", "google"].contains(command)
    if mayActivate { pendingAuthentications.insert(operationEpoch) }
    defer { pendingAuthentications.remove(operationEpoch) }
    do {
      switch command {
      case "resolveSession":
        guard inputs["forceFresh"] as? Bool == true else { throw AuthFailure.invalidInput }
        guard pendingAuthentications.isEmpty, pendingSignOuts.isEmpty else { return snapshot(status: "unavailable", failure: .cancelled) }
        do {
          let session = try await provider.validateSessionFresh()
          try requireCurrent(operationEpoch)
          return try validatedSnapshot(session)
        } catch {
          try requireCurrent(operationEpoch)
          return snapshot(status: "unavailable", failure: safeFailure(error))
        }
      case "signOut":
        pendingSignOuts.insert(operationEpoch)
        defer { pendingSignOuts.remove(operationEpoch) }
        let sessionId = try requiredString("sessionId", inputs)
        guard let storedId = provider.storedSessionId else { return snapshot(status: "signedOut") }
        guard storedId == sessionId else { throw AuthFailure.invalidInput }
        do {
          try await provider.signOut(sessionId: sessionId)
          try requireCurrent(operationEpoch)
          guard provider.storedSessionId == nil else { throw AuthFailure.storage }
          attempts.removeAll()
          return snapshot(status: "signedOut")
        } catch {
          try requireCurrent(operationEpoch)
          if provider.storedSessionId == nil {
            attempts.removeAll()
            return snapshot(status: "signedOut")
          }
          throw error
        }
      case "password":
        let email = try requiredString("email", inputs)
        let password = try requiredString("password", inputs)
        return try await process(try await provider.password(email: email, password: password), epoch: operationEpoch)
      case "requestCode":
        let email = try requiredString("email", inputs)
        return try await process(try await provider.requestCode(email: email), epoch: operationEpoch)
      case "google":
        return try await process(try await provider.google(transferable: false), epoch: operationEpoch)
      case "verifyCode", "resendCode":
        let handle = try requiredString("attemptId", inputs)
        let purpose = try requiredString("codePurpose", inputs)
        guard let attempt = attempts[handle], attempt.purpose == purpose else { throw AuthFailure.invalidInput }
        let result: ProviderAttempt
        if command == "verifyCode" {
          result = try await provider.verifyCode(attemptId: attempt.providerId, code: requiredString("code", inputs), purpose: purpose)
        } else {
          result = try await provider.resendCode(attemptId: attempt.providerId, purpose: purpose)
        }
        return try await process(result, epoch: operationEpoch, handle: handle)
      default:
        throw AuthFailure.invalidInput
      }
    } catch {
      return self.error(safeFailure(error))
    }
  }

  private func process(_ attempt: ProviderAttempt, epoch: Int, handle: String? = nil) async throws -> String {
    try await compensateIfObsolete(attempt, operationEpoch: epoch)
    switch attempt.stage {
    case .existingAccountRequired:
      throw AuthFailure.existingAccountRequired
    case .unsupported:
      throw AuthFailure.verificationRequired
    case .emailCode, .deviceTrust:
      let purpose = attempt.stage == .deviceTrust ? "deviceTrust" : "signIn"
      let opaque = handle ?? UUID().uuidString
      attempts[opaque] = Attempt(providerId: attempt.id, purpose: purpose)
      return encode(["kind": "challenge", "attemptId": opaque, "codePurpose": purpose])
    case .complete:
      let session = try await provider.validateSessionFresh()
      try await compensateIfObsolete(attempt, operationEpoch: epoch)
      guard let session, let createdId = attempt.createdSessionId, createdId == session.sessionId else {
        throw AuthFailure.verificationRequired
      }
      let result = try validatedSnapshot(session)
      attempts.removeAll()
      return result
    }
  }

  private func compensateIfObsolete(_ attempt: ProviderAttempt, operationEpoch: Int) async throws {
    guard epoch != operationEpoch else { return }
    if let createdId = attempt.createdSessionId {
      obsoleteSessions.insert(createdId)
      try await provider.signOut(sessionId: createdId)
      obsoleteSessions.remove(createdId)
    }
    throw AuthFailure.cancelled
  }

  private func validatedSnapshot(_ session: ProviderSession?) throws -> String {
    guard let session else { return snapshot(status: "signedOut") }
    guard !obsoleteSessions.contains(session.sessionId) else { throw AuthFailure.cancelled }
    guard session.active, !session.hasPendingTasks, !session.sessionId.isEmpty, !session.accountId.isEmpty else {
      throw AuthFailure.verificationRequired
    }
    return snapshot(status: "active", session: session)
  }

  private func snapshot(status: String, session: ProviderSession? = nil, failure: AuthFailure? = nil) -> String {
    revision += 1
    hasActiveSnapshot = status == "active"
    var value: [String: Any] = ["status": status, "generation": generation, "revision": revision]
    if let session {
      value["sessionId"] = session.sessionId
      value["accountId"] = session.accountId
      value["validatedAt"] = Int(Date().timeIntervalSince1970 * 1000)
    }
    if let failure { value["error"] = ["code": failure.rawValue] }
    let encoded = encode(value)
    if eventsEnabled { onSnapshot?(encoded) }
    return encoded
  }

  private func requiredString(_ key: String, _ inputs: [String: Any]) throws -> String {
    guard let value = inputs[key] as? String, !value.isEmpty else { throw AuthFailure.invalidInput }
    return value
  }
  private func requireCurrent(_ operationEpoch: Int) throws {
    guard epoch == operationEpoch else { throw AuthFailure.cancelled }
  }
  private func safeFailure(_ error: Error) -> AuthFailure {
    if let failure = error as? AuthFailure { return failure }
    if error is CancellationError { return .cancelled }
    if let networkError = error as? URLError { return networkError.code == .timedOut ? .timeout : .network }
    return .unexpected
  }
  private func error(_ failure: AuthFailure) -> String {
    encode(["kind": "error", "code": failure.rawValue])
  }
  private func encode(_ value: [String: Any]) -> String {
    guard let data = try? JSONSerialization.data(withJSONObject: value) else {
      return "{\"kind\":\"error\",\"code\":\"unexpected\"}"
    }
    return String(decoding: data, as: UTF8.self)
  }
}
