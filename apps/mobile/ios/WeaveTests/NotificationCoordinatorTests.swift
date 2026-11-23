import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationCoordinatorTests: XCTestCase {
  @MainActor func testS04SuccessfulJWTRenewalRearmsNewInvalidationAndFencesInterruptedGrant() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.sdk.onJwtInvalidated?("account-a")
    for _ in 0..<100 where fixture.sdk.logins.count < 2 { await Task.yield() }
    XCTAssertEqual(fixture.sdk.logins.count, 2)
    fixture.transport.pauseGrant = true
    fixture.sdk.onJwtInvalidated?("account-a")
    XCTAssertFalse(fixture.coordinator.foregroundAuthorized(), "A new rejected JWT must immediately suppress foreground delivery")
    for _ in 0..<100 where fixture.transport.grants < 3 { await Task.yield() }
    XCTAssertEqual(fixture.transport.grants, 3)
    fixture.sdk.onJwtInvalidated?("account-a")
    fixture.transport.grantGate.resolve(fixture.transport.grantResponse)
    for _ in 0..<100 { await Task.yield() }
    XCTAssertFalse(fixture.coordinator.foregroundAuthorized(), "A later invalidation must fence a suspended grant completion")
    XCTAssertEqual(fixture.sdk.logins.count, 2)
    XCTAssertEqual(fixture.transport.grants, 3, "Repeated callbacks cannot retry an interrupted episode")
  }
  @MainActor func testS09ReadinessAttemptHighWaterSurvivesRolloverAndGenerationChanges() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    let observation = await fixture.call("reconcile", bound: true, generation: 7)
    for index in 1...257 {
      _ = await fixture.call("refresh", bound: true, generation: 7, extra: ["revision": observation["revision"] ?? 0, "attemptId": String(index)])
    }
    let replay = await fixture.call("refresh", bound: true, generation: 7, extra: ["revision": observation["revision"] ?? 0, "attemptId": "1"])
    XCTAssertEqual(replay["code"] as? String, "stale")
    let next = await fixture.call("reconcile", bound: true, generation: 8)
    let replayAfterGeneration = await fixture.call("refresh", bound: true, generation: 8, extra: ["revision": next["revision"] ?? 0, "attemptId": "2"])
    XCTAssertEqual(replayAfterGeneration["code"] as? String, "stale")
    for invalid in ["0", "01", "-1", "attempt-a", "9007199254740992"] {
      let result = await fixture.call("refresh", bound: true, generation: 8, extra: ["revision": next["revision"] ?? 0, "attemptId": invalid])
      XCTAssertEqual(result["code"] as? String, "invalid-request")
    }
    let wrongRevision = await fixture.call("refresh", bound: true, generation: 8, extra: ["revision": 900000, "attemptId": "258"])
    XCTAssertEqual(wrongRevision["code"] as? String, "stale")
    let validAfterWrongRevision = await fixture.call("refresh", bound: true, generation: 8, extra: ["revision": next["revision"] ?? 0, "attemptId": "258"])
    XCTAssertEqual(validAfterWrongRevision["kind"] as? String, "readiness")
    _ = await fixture.call("acquire")
    let replayAfterSameLeaseAcquire = await fixture.call("refresh", bound: true, generation: 8, extra: ["revision": next["revision"] ?? 0, "attemptId": "258"])
    XCTAssertEqual(replayAfterSameLeaseAcquire["code"] as? String, "stale")
  }
  @MainActor func testS04PromptCompletionAfterLogoutOrAccountReplacementCannotOptIn() async {
    for replacingAccount in [false, true] {
      let fixture = CoordinatorFixture()
      _ = await fixture.call("acquire")
      _ = await fixture.call("reconcile", bound: true, generation: 7)
      fixture.sdk.status = .init(status: .notDetermined, canRequest: true)
      fixture.sdk.pausePrompt = true
      let prompt = Task { _ = await fixture.call("enable", bound: true, generation: 7) }
      for _ in 0..<100 where fixture.sdk.requests == 0 { await Task.yield() }
      if replacingAccount {
        fixture.authority.invalidate(); fixture.authority.active = true
        fixture.authority.context = .init(sessionId: "session-b", accountId: "account-b", generation: 8)
        _ = await fixture.call("reconcile", bound: true, generation: 8, extra: ["sessionId": "session-b", "accountId": "account-b"])
      } else { _ = await fixture.call("reconcile", generation: 8) }
      fixture.sdk.promptGate.resolve(true)
      _ = await prompt.value
      XCTAssertEqual(fixture.sdk.optIns, 0)
    }
  }
  @MainActor func testS04InvalidatedJWTLosesEligibilityAndExplicitRetryRecoversAfterCooldown() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.transport.grantResponse = .response(status: 503, body: Data("{\"code\":\"notifications_unavailable\",\"retryAfterSeconds\":5}".utf8))
    fixture.sdk.onJwtInvalidated?("account-a")
    for _ in 0..<100 where fixture.transport.grants < 2 { await Task.yield() }
    let duringFailure = await fixture.call("openSettings", bound: true, generation: 7)
    XCTAssertEqual(duringFailure["matchesCurrentAccount"] as? Bool, false)
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    XCTAssertEqual(fixture.transport.grants, 2)
    fixture.clock.advance(5)
    fixture.sdk.onJwtInvalidated?("account-a")
    fixture.sdk.onJwtInvalidated?("account-a")
    for _ in 0..<30 { await Task.yield() }
    XCTAssertEqual(fixture.transport.grants, 2, "The same invalidation episode cannot retry itself after cooldown")
    fixture.transport.grantResponse = .response(status: 200, body: Data("{\"externalId\":\"account-a\",\"token\":\"renewed-secret\",\"expiresAt\":\"1970-01-11T10:05:00Z\"}".utf8))
    let recovered = await fixture.call("reconcile", bound: true, generation: 7)
    XCTAssertEqual(recovered["matchesCurrentAccount"] as? Bool, true)
    XCTAssertEqual(fixture.sdk.logins.last?.1, "renewed-secret")
    XCTAssertEqual(fixture.transport.grants, 3)
  }
  @MainActor func testS03SignedBindingRemainsOnlyAnObservationAndKeepsCredentialsNative() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    let result = await fixture.call("reconcile", bound: true, generation: 7)
    XCTAssertEqual(result["kind"] as? String, "observation")
    XCTAssertEqual(result["matchesCurrentAccount"] as? Bool, true)
    XCTAssertEqual(fixture.sdk.logins.count, 1)
    XCTAssertEqual(fixture.sdk.logins.first?.1, "identity-secret")
    let json = fixture.lastResult
    for secret in ["identity-secret", "push-secret", "account-a", fixture.sdk.subscriptionId] { XCTAssertFalse(json.contains(secret)) }
    XCTAssertNil(result["status"])
    XCTAssertEqual(fixture.sdk.initializations, 1)
  }

  @MainActor func testS04OlderActiveIntentCannotRebindAfterHigherGenerationLogout() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    _ = await fixture.call("reconcile", generation: 8)
    let stale = await fixture.call("reconcile", bound: true, generation: 7)
    XCTAssertEqual(stale["code"] as? String, "stale")
    XCTAssertNil(fixture.sdk.externalId)
    XCTAssertEqual(fixture.sdk.logins.count, 1)
  }

  @MainActor func testS04SameGenerationCannotChangeIdentityAndNativeAuthorityIsRequired() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    let changed = await fixture.call("reconcile", bound: false, generation: 7)
    XCTAssertEqual(changed["code"] as? String, "stale")
    fixture.authority.invalidate()
    let wrong = await fixture.call("reconcile", bound: true, generation: 9)
    XCTAssertEqual(wrong["code"] as? String, "unavailable")
    XCTAssertNil(fixture.sdk.externalId)
  }

  @MainActor func testS04LateGrantAfterLogoutCannotDispatchLogin() async {
    let fixture = CoordinatorFixture()
    fixture.transport.pauseGrant = true
    _ = await fixture.call("acquire")
    let setup = Task { _ = await fixture.call("reconcile", bound: true, generation: 7) }
    for _ in 0..<100 where fixture.transport.grants == 0 { await Task.yield() }
    _ = await fixture.call("reconcile", generation: 8)
    fixture.transport.grantGate.resolve(fixture.transport.grantResponse)
    _ = await setup.value
    XCTAssertTrue(fixture.sdk.logins.isEmpty)
    XCTAssertNil(fixture.sdk.externalId)
  }

  @MainActor func testS04ShortOrFailedGrantHasNoAutomaticRefreshLoop() async {
    let fixture = CoordinatorFixture()
    fixture.transport.grantResponse = .response(status: 503, body: Data("{\"code\":\"notifications_unavailable\",\"retryAfterSeconds\":5}".utf8))
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.sdk.onJwtInvalidated?("account-a")
    fixture.sdk.onJwtInvalidated?("account-a")
    for _ in 0..<20 { await Task.yield() }
    XCTAssertEqual(fixture.transport.grants, 1)
    XCTAssertTrue(fixture.sdk.logins.isEmpty)
    fixture.transport.grantResponse = .response(status: 200, body: Data("{\"externalId\":\"account-a\",\"token\":\"short-secret\",\"expiresAt\":\"1970-01-11T10:00:01Z\"}".utf8))
    fixture.clock.advance(5)
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    XCTAssertTrue(fixture.sdk.logins.isEmpty)
    XCTAssertEqual(fixture.transport.grants, 2)
  }

  @MainActor func testS11ReadinessIsCorrelatedAndUsesRemainingMonotonicDuration() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    let observation = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.transport.pauseReadiness = true
    let request = Task { _ = await fixture.call("refresh", bound: true, generation: 7, extra: ["revision": observation["revision"] ?? 0, "attemptId": "1"]); return fixture.lastResult }
    for _ in 0..<100 where fixture.transport.checks == 0 { await Task.yield() }
    fixture.clock.advance(12)
    fixture.transport.readinessGate.resolve(.response(status: 200, body: Data("{\"status\":\"ready\",\"checkedAt\":\"2026-10-17T00:00:00Z\",\"validForSeconds\":60}".utf8)))
    let result = (try? JSONSerialization.jsonObject(with: Data(await request.value.utf8))) as? [String: Any] ?? [:]
    XCTAssertEqual(result["kind"] as? String, "readiness")
    XCTAssertEqual(result["attemptId"] as? String, "1")
    XCTAssertEqual(result["status"] as? String, "ready")
    XCTAssertEqual(result["remainingValidityMs"] as? Int, 48000)
  }

  @MainActor func testS11RegistrationChangeRejectsLateReady() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    let observation = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.transport.pauseReadiness = true
    let request = Task { _ = await fixture.call("refresh", bound: true, generation: 7, extra: ["revision": observation["revision"] ?? 0, "attemptId": "1"]); return fixture.lastResult }
    for _ in 0..<100 where fixture.transport.checks == 0 { await Task.yield() }
    fixture.sdk.subscriptionId = "e3d647d0-8277-4ae0-b46d-a2d836bd839d"
    fixture.sdk.onChanged?()
    fixture.transport.readinessGate.resolve(.response(status: 200, body: Data("{\"status\":\"ready\",\"checkedAt\":\"2026-10-17T00:00:00Z\",\"validForSeconds\":60}".utf8)))
    let result = (try? JSONSerialization.jsonObject(with: Data(await request.value.utf8))) as? [String: Any] ?? [:]
    XCTAssertNotEqual(result["status"] as? String, "ready")
  }

  @MainActor func testS09RootReplacementAndStaleReleaseKeepOneProcessOwner() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    _ = await fixture.call("acquire", lease: "root-b")
    _ = await fixture.call("reconcile", bound: true, generation: 1, lease: "root-b")
    let stale = await fixture.call("release")
    XCTAssertEqual(stale["code"] as? String, "stale")
    XCTAssertEqual(fixture.sdk.externalId, "account-a")
    XCTAssertEqual(fixture.sdk.initializations, 1)
  }

  @MainActor func testS09NativeInvalidationSuspendsAccountWhileJSIsAbsent() async {
    let fixture = CoordinatorFixture()
    _ = await fixture.call("acquire")
    _ = await fixture.call("reconcile", bound: true, generation: 7)
    fixture.authority.invalidate()
    XCTAssertNil(fixture.sdk.externalId)
    XCTAssertFalse(fixture.sdk.foregroundAllowed)
  }

  @MainActor func testS04MalformedBridgeInputsFailBeforeEffects() async {
    let fixture = CoordinatorFixture()
    for payload in ["[]", "{\"version\":true,\"rootLease\":\"r\",\"generation\":0}", "{\"version\":1,\"rootLease\":\"r\",\"generation\":0,\"token\":\"secret\"}", String(repeating: "x", count: 4097)] {
      let value = await fixture.coordinator.execute(command: "acquire", payload: payload)
      XCTAssertTrue(value.contains("invalid-request"))
      XCTAssertFalse(value.contains("secret"))
    }
    _ = await fixture.call("acquire")
    let unknown = await fixture.call("login", bound: true)
    XCTAssertEqual(unknown["code"] as? String, "invalid-request")
    XCTAssertTrue(fixture.sdk.logins.isEmpty)
  }
}

@MainActor final class CoordinatorFixture {
  let sdk = NotificationSDKFixture()
  let authority = NotificationAuthorityFixture()
  let transport = NotificationTransportFixture()
  let clock = NotificationTestClock()
  let coordinator: NotificationCoordinator
  var lastResult = ""
  init() { coordinator = NotificationCoordinator(sdk: sdk, authority: authority, transport: transport, clock: clock, appId: "a791289b-4d11-40dc-b24f-1f82a329d335") }
  func call(_ command: String, bound: Bool = false, generation: Int = 0, lease: String = "root-a", extra: [String: Any] = [:]) async -> [String: Any] {
    var body: [String: Any] = ["version": 1, "rootLease": lease, "generation": generation]
    if bound { body["sessionId"] = "session-a"; body["accountId"] = "account-a" }
    body.merge(extra) { _, new in new }
    lastResult = await coordinator.execute(command: command, payload: String(decoding: try! JSONSerialization.data(withJSONObject: body), as: UTF8.self))
    return (try? JSONSerialization.jsonObject(with: Data(lastResult.utf8))) as? [String: Any] ?? [:]
  }
}

@MainActor final class NotificationTransportFixture: SessionAuthorizedTransport {
  var grants = 0
  var checks = 0
  var pauseGrant = false
  var pauseReadiness = false
  var grantResponse: NotificationHttpResult = .response(status: 200, body: Data("{\"externalId\":\"account-a\",\"token\":\"identity-secret\",\"expiresAt\":\"1970-01-11T10:05:00Z\"}".utf8))
  let grantGate = NotificationDeferred<NotificationHttpResult>()
  let readinessGate = NotificationDeferred<NotificationHttpResult>()
  func execute(context: NotificationSessionContext, operation: NotificationHttpOperation) async -> NotificationHttpResult {
    switch operation {
    case .identityGrant: grants += 1; return pauseGrant ? await grantGate.value() : grantResponse
    case .readiness: checks += 1; return pauseReadiness ? await readinessGate.value() : .response(status: 200, body: Data("{\"status\":\"pending\",\"checkedAt\":\"2026-10-17T00:00:00Z\",\"validForSeconds\":0}".utf8))
    }
  }
}

@MainActor final class NotificationSDKFixture: NotificationSDK {
  var subscriptionId = "d3d647d0-8277-4ae0-b46d-a2d836bd839d"
  var externalId: String?
  var optedIn = true
  var status = NotificationPlatformPermission(status: .authorized, canRequest: false)
  var initializations = 0
  var logins: [(String, String)] = []
  var foregroundAllowed = false
  var requests = 0
  var optIns = 0
  var pausePrompt = false
  let promptGate = NotificationDeferred<Bool>()
  var onChanged: (() -> Void)?
  var onJwtInvalidated: ((String) -> Void)?
  var installation: NotificationInstallation { .init(subscriptionId: subscriptionId, token: "push-secret", externalId: externalId, optedIn: optedIn, permission: status) }
  func initialize(appId: String) { initializations += 1 }
  func login(accountId: String, token: String) { logins.append((accountId, token)); externalId = accountId }
  func logout() { externalId = nil; foregroundAllowed = false }
  func setForegroundAllowed(_ allowed: Bool) { foregroundAllowed = allowed }
  func permission() async throws -> NotificationPlatformPermission { status }
  func requestPermission() async throws { requests += 1; if pausePrompt { _ = await promptGate.value() }; status = .init(status: .authorized, canRequest: false) }
  func optIn() async throws { optIns += 1; optedIn = true }
  func openSettings() async throws {}
}
