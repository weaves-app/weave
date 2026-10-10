import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

@MainActor
final class ProviderFixture: AuthProvider {
  var invalidationHandler: (() -> Void)?
  var passwordContinuation: CheckedContinuation<ProviderAttempt, Never>?
  var delayPassword = false
  var signOutContinuation: CheckedContinuation<Void, Never>?
  var delaySignOut = false
  var abandonedAttempts = 0
  func abandonAttempts() { abandonedAttempts += 1 }
  var session: ProviderSession? = ProviderSession(sessionId: "sess_1", accountId: "user_1", active: true, hasPendingTasks: false)
  var attempt = ProviderAttempt(id: "provider_attempt", stage: .complete, createdSessionId: "sess_1")
  var failure: AuthFailure?
  var freshValidationCalls = 0
  var googleTransferable: Bool?
  var verifyPurposes: [String] = []
  var resendPurposes: [String] = []
  var emitInvalidationOnSignOut = false
  var clearBeforeSignOutFailure = false
  var revoked: [String] = []
  var storedSessionId: String? = "sess_1"
  func validateSessionFresh() async throws -> ProviderSession? {
    freshValidationCalls += 1
    if let failure { throw failure }
    return session
  }
  func password(email: String, password: String) async throws -> ProviderAttempt {
    if delayPassword {
      return await withCheckedContinuation { passwordContinuation = $0 }
    }
    return try result()
  }
  func requestCode(email: String) async throws -> ProviderAttempt { try result() }
  func verifyCode(attemptId: String, code: String, purpose: String) async throws -> ProviderAttempt {
    verifyPurposes.append(purpose)
    return try result()
  }
  func resendCode(attemptId: String, purpose: String) async throws -> ProviderAttempt {
    resendPurposes.append(purpose)
    return try result()
  }
  func google(transferable: Bool) async throws -> ProviderAttempt {
    googleTransferable = transferable
    return try result()
  }
  func signOut(sessionId: String) async throws {
    if delaySignOut { await withCheckedContinuation { signOutContinuation = $0 } }
    if clearBeforeSignOutFailure && storedSessionId == sessionId { storedSessionId = nil }
    if let failure { throw failure }
    revoked.append(sessionId)
    if storedSessionId == sessionId { storedSessionId = nil; session = nil }
    if emitInvalidationOnSignOut { invalidationHandler?() }
  }
  private func result() throws -> ProviderAttempt {
    if let failure { throw failure }
    return attempt
  }
}

final class WeaveAuthBehaviorTests: XCTestCase {
  @MainActor
  private func execute(_ service: ClerkAuthService, _ command: String, _ inputs: [String: Any] = [:], generation: Int = 1) async -> [String: Any] {
    var payload = inputs
    payload["generation"] = generation
    payload["operationId"] = "operation_\(generation)"
    let data = try! JSONSerialization.data(withJSONObject: payload)
    let result = await service.execute(command: command, payload: String(decoding: data, as: UTF8.self))
    return (try! JSONSerialization.jsonObject(with: Data(result.utf8))) as! [String: Any]
  }

  @MainActor
  func testCompletedPasswordRequiresFreshActiveSessionValidation() async {
    let provider = ProviderFixture()
    let result = await execute(ClerkAuthService(provider: provider), "password", ["email": "fixture@example.test", "password": "seeded-secret"])
    XCTAssertEqual(result["status"] as? String, "active")
    XCTAssertEqual(result["sessionId"] as? String, "sess_1")
    XCTAssertEqual(result["accountId"] as? String, "user_1")
    XCTAssertNotNil(result["validatedAt"])
    XCTAssertEqual(provider.freshValidationCalls, 1)
    XCTAssertFalse(String(describing: result).contains("seeded-secret"))
  }

  @MainActor
  func testCachedIdentityDoesNotAuthorizeWhenFreshValidationFails() async {
    let provider = ProviderFixture()
    provider.failure = .network
    let result = await execute(ClerkAuthService(provider: provider), "resolveSession", ["forceFresh": true])
    XCTAssertEqual(result["status"] as? String, "unavailable")
    XCTAssertNil(result["sessionId"])
    XCTAssertEqual(provider.freshValidationCalls, 1)
  }

  @MainActor
  func testProviderSessionTasksBlockCompletedAuthentication() async {
    let provider = ProviderFixture()
    provider.session = ProviderSession(sessionId: "sess_1", accountId: "user_1", active: true, hasPendingTasks: true)
    let result = await execute(ClerkAuthService(provider: provider), "password", ["email": "fixture@example.test", "password": "seeded-secret"])
    XCTAssertEqual(result["code"] as? String, "verificationRequired")
    XCTAssertNil(result["sessionId"])
  }

  @MainActor
  func testGoogleExplicitlyDisablesSignupTransfer() async {
    let provider = ProviderFixture()
    let result = await execute(ClerkAuthService(provider: provider), "google")
    XCTAssertEqual(result["status"] as? String, "active")
    XCTAssertEqual(provider.googleTransferable, false)
  }

  @MainActor
  func testUnknownGoogleIdentityDoesNotActivateOrCreateAccount() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "unknown", stage: .existingAccountRequired, createdSessionId: nil)
    let result = await execute(ClerkAuthService(provider: provider), "google")
    XCTAssertEqual(result["code"] as? String, "existingAccountRequired")
    XCTAssertNil(result["sessionId"])
    XCTAssertEqual(provider.freshValidationCalls, 0)
  }

  @MainActor
  func testEmailCodeChallengeSurvivesNewVerificationGeneration() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .emailCode, createdSessionId: nil)
    let service = ClerkAuthService(provider: provider)
    let challenge = await execute(service, "requestCode", ["email": "fixture@example.test"])
    XCTAssertEqual(challenge["kind"] as? String, "challenge")
    XCTAssertEqual(challenge["codePurpose"] as? String, "signIn")
    let handle = challenge["attemptId"] as? String ?? "missing"
    XCTAssertNotEqual(handle, "provider_attempt")
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .complete, createdSessionId: "sess_1")
    let result = await execute(service, "verifyCode", ["attemptId": handle, "code": "123456", "codePurpose": "signIn"], generation: 2)
    XCTAssertEqual(result["status"] as? String, "active")
    XCTAssertEqual(result["generation"] as? Int, 2)
    XCTAssertEqual(provider.verifyPurposes, ["signIn"])
  }

  @MainActor
  func testPasswordDeviceTrustChallengeUsesSupportedCodePurpose() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .deviceTrust, createdSessionId: nil)
    let result = await execute(ClerkAuthService(provider: provider), "password", ["email": "fixture@example.test", "password": "seeded-secret"])
    XCTAssertEqual(result["kind"] as? String, "challenge")
    XCTAssertEqual(result["codePurpose"] as? String, "deviceTrust")
    XCTAssertEqual(provider.freshValidationCalls, 0)
  }

  @MainActor
  func testUnsupportedFactorDoesNotActivateSession() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .unsupported, createdSessionId: nil)
    let result = await execute(ClerkAuthService(provider: provider), "password", ["email": "fixture@example.test", "password": "seeded-secret"])
    XCTAssertEqual(result["code"] as? String, "verificationRequired")
    XCTAssertEqual(provider.freshValidationCalls, 0)
  }

  @MainActor
  func testProviderErrorsAreSafeAndSpecific() async {
    for code in [AuthFailure.rejectedCredentials, .codeInvalid, .codeExpired, .rateLimited, .storage, .cancelled] {
      let provider = ProviderFixture()
      provider.failure = code
      let result = await execute(ClerkAuthService(provider: provider), "password", ["email": "fixture@example.test", "password": "seeded-secret"])
      XCTAssertEqual(result["code"] as? String, code.rawValue)
      XCTAssertNil(result["sessionId"])
      XCTAssertFalse(String(describing: result).contains("seeded-secret"))
    }
  }

  @MainActor
  func testLearnedInvalidationPublishesOrderedSignedOutEvent() async {
    let provider = ProviderFixture()
    let service = ClerkAuthService(provider: provider)
    var events: [[String: Any]] = []
    service.onSnapshot = { encoded in
      events.append((try! JSONSerialization.jsonObject(with: Data(encoded.utf8))) as! [String: Any])
    }
    let active = await execute(service, "resolveSession", ["forceFresh": true])
    provider.storedSessionId = nil
    provider.invalidationHandler?()
    XCTAssertEqual(events.last?["status"] as? String, "signedOut")
    XCTAssertEqual(events.last?["generation"] as? Int, 1)
    XCTAssertGreaterThan(events.last?["revision"] as? Int ?? 0, active["revision"] as? Int ?? 0)
  }

  @MainActor
  func testAbandonedLateActivationEndsOnlyObsoleteNewSession() async {
    let provider = ProviderFixture()
    provider.delayPassword = true
    let service = ClerkAuthService(provider: provider)
    let pending = Task { await self.execute(service, "password", ["email": "fixture@example.test", "password": "seeded-secret"])["code"] as? String }
    for _ in 0..<20 where provider.passwordContinuation == nil { await Task.yield() }
    XCTAssertNotNil(provider.passwordContinuation)
    _ = await execute(service, "abandon", generation: 1)
    provider.storedSessionId = "sess_newer"
    provider.passwordContinuation?.resume(returning: ProviderAttempt(id: "late", stage: .complete, createdSessionId: "sess_obsolete"))
    let result = await pending.value
    XCTAssertEqual(result, "cancelled")
    XCTAssertEqual(provider.revoked, ["sess_obsolete"])
    XCTAssertEqual(provider.storedSessionId, "sess_newer")
  }


  @MainActor
  func testFreshResolutionCannotAuthorizeWhileAbandonedActivationStillRuns() async {
    let provider = ProviderFixture()
    provider.delayPassword = true
    let service = ClerkAuthService(provider: provider)
    let pending = Task { await self.execute(service, "password", ["email": "fixture@example.test", "password": "seeded-secret"])["code"] as? String }
    for _ in 0..<20 where provider.passwordContinuation == nil { await Task.yield() }
    XCTAssertNotNil(provider.passwordContinuation)
    _ = await execute(service, "abandon", generation: 1)
    let result = await execute(service, "resolveSession", ["forceFresh": true], generation: 2)
    XCTAssertEqual(result["status"] as? String, "unavailable")
    XCTAssertNil(result["sessionId"])
    provider.passwordContinuation?.resume(returning: ProviderAttempt(id: "late", stage: .complete, createdSessionId: "sess_obsolete"))
    _ = await pending.value
  }


  @MainActor
  func testLogoutClearsOnlyCurrentSessionAndReturnsSignedOut() async {
    let provider = ProviderFixture()
    let result = await execute(ClerkAuthService(provider: provider), "signOut", ["sessionId": "sess_1"])
    XCTAssertEqual(result["status"] as? String, "signedOut")
    XCTAssertEqual(provider.revoked, ["sess_1"])
    XCTAssertNil(provider.storedSessionId)
    XCTAssertNil(result["sessionId"])
  }

  @MainActor
  func testLogoutStorageFailureBeforeClearDoesNotReportSuccess() async {
    let provider = ProviderFixture()
    provider.failure = .storage
    let result = await execute(ClerkAuthService(provider: provider), "signOut", ["sessionId": "sess_1"])
    XCTAssertEqual(result["code"] as? String, "storage")
    XCTAssertNil(result["status"])
    XCTAssertEqual(provider.storedSessionId, "sess_1")
  }

  @MainActor
  func testLogoutRemoteFailureAfterLocalClearReportsSignedOut() async {
    let provider = ProviderFixture()
    provider.failure = .network
    provider.clearBeforeSignOutFailure = true
    let result = await execute(ClerkAuthService(provider: provider), "signOut", ["sessionId": "sess_1"])
    XCTAssertEqual(result["status"] as? String, "signedOut")
    XCTAssertNil(provider.storedSessionId)
  }

  @MainActor
  func testLogoutCannotClearUnrelatedCurrentSession() async {
    let provider = ProviderFixture()
    let result = await execute(ClerkAuthService(provider: provider), "signOut", ["sessionId": "sess_unrelated"])
    XCTAssertEqual(result["code"] as? String, "invalidInput")
    XCTAssertEqual(provider.storedSessionId, "sess_1")
    XCTAssertTrue(provider.revoked.isEmpty)
  }


  @MainActor
  func testSDKLogoutInvalidationDoesNotCancelItsOwnSuccessfulOutcome() async {
    let provider = ProviderFixture()
    provider.emitInvalidationOnSignOut = true
    let service = ClerkAuthService(provider: provider)
    _ = await execute(service, "resolveSession", ["forceFresh": true])
    let result = await execute(service, "signOut", ["sessionId": "sess_1"], generation: 2)
    XCTAssertEqual(result["status"] as? String, "signedOut")
    XCTAssertNil(provider.storedSessionId)
  }


  @MainActor
  func testReloadCannotAuthorizeUntilPendingLogoutActuallySettles() async {
    let provider = ProviderFixture()
    provider.delaySignOut = true
    let service = ClerkAuthService(provider: provider)
    _ = await execute(service, "resolveSession", ["forceFresh": true])
    let pending = Task { await self.execute(service, "signOut", ["sessionId": "sess_1"], generation: 2)["code"] as? String }
    for _ in 0..<20 where provider.signOutContinuation == nil { await Task.yield() }
    XCTAssertNotNil(provider.signOutContinuation)
    _ = await execute(service, "abandon", generation: 2)
    let unresolved = await execute(service, "resolveSession", ["forceFresh": true], generation: 3)
    XCTAssertEqual(unresolved["status"] as? String, "unavailable")
    XCTAssertNil(unresolved["sessionId"])
    provider.signOutContinuation?.resume()
    _ = await pending.value
    let reconciled = await execute(service, "resolveSession", ["forceFresh": true], generation: 4)
    XCTAssertEqual(reconciled["status"] as? String, "signedOut")
  }

  @MainActor
  func testAbandonReleasesProviderAttemptsWithoutWipingSessionCredentials() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .emailCode, createdSessionId: nil)
    let service = ClerkAuthService(provider: provider)
    _ = await execute(service, "requestCode", ["email": "fixture@example.test"])
    _ = await execute(service, "abandon")
    XCTAssertEqual(provider.abandonedAttempts, 1)
    XCTAssertEqual(provider.storedSessionId, "sess_1")
    XCTAssertTrue(provider.revoked.isEmpty)
  }


  @MainActor
  func testLearnedLocalClearLeavesProtectedUIWhileLogoutNetworkIsPending() async {
    let provider = ProviderFixture()
    provider.delaySignOut = true
    let service = ClerkAuthService(provider: provider)
    var lastStatus: String?
    service.onSnapshot = { value in
      lastStatus = ((try? JSONSerialization.jsonObject(with: Data(value.utf8))) as? [String: Any])?["status"] as? String
    }
    _ = await execute(service, "resolveSession", ["forceFresh": true])
    let pending = Task { await self.execute(service, "signOut", ["sessionId": "sess_1"], generation: 2)["status"] as? String }
    for _ in 0..<20 where provider.signOutContinuation == nil { await Task.yield() }
    provider.storedSessionId = nil
    provider.session = nil
    provider.invalidationHandler?()
    XCTAssertEqual(lastStatus, "signedOut")
    provider.signOutContinuation?.resume()
    let result = await pending.value
    XCTAssertEqual(result, "signedOut")
  }


  @MainActor
  func testDeviceTrustResendAndVerificationRetainPurposeAndSafeRetryErrors() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .deviceTrust, createdSessionId: nil)
    let service = ClerkAuthService(provider: provider)
    let challenge = await execute(service, "password", ["email": "fixture@example.test", "password": "seeded-secret"])
    let handle = challenge["attemptId"] as? String ?? "missing"
    let inputs: [String: Any] = ["attemptId": handle, "codePurpose": "deviceTrust", "code": "123456"]
    let resent = await execute(service, "resendCode", inputs, generation: 2)
    XCTAssertEqual(resent["attemptId"] as? String, handle)
    XCTAssertEqual(resent["codePurpose"] as? String, "deviceTrust")
    for (index, failure) in [AuthFailure.codeInvalid, .codeExpired].enumerated() {
      provider.failure = failure
      let failed = await execute(service, "verifyCode", inputs, generation: index + 3)
      XCTAssertEqual(failed["code"] as? String, failure.rawValue)
      XCTAssertNil(failed["sessionId"])
    }
    provider.failure = .rateLimited
    let limited = await execute(service, "resendCode", inputs, generation: 5)
    XCTAssertEqual(limited["code"] as? String, "rateLimited")
    provider.failure = nil
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .complete, createdSessionId: "sess_1")
    let completed = await execute(service, "verifyCode", inputs, generation: 6)
    XCTAssertEqual(completed["status"] as? String, "active")
    XCTAssertEqual(provider.resendPurposes, ["deviceTrust", "deviceTrust"])
    XCTAssertEqual(provider.verifyPurposes, ["deviceTrust", "deviceTrust", "deviceTrust"])
  }

  @MainActor
  func testForgedCodePurposeCannotBypassVerificationAndDisposePreservesSessionCredentials() async {
    let provider = ProviderFixture()
    provider.attempt = ProviderAttempt(id: "provider_attempt", stage: .emailCode, createdSessionId: nil)
    let service = ClerkAuthService(provider: provider)
    let challenge = await execute(service, "requestCode", ["email": "fixture@example.test"])
    let handle = challenge["attemptId"] as? String ?? "missing"
    let forged = await execute(service, "verifyCode", ["attemptId": handle, "codePurpose": "deviceTrust", "code": "123456"], generation: 2)
    XCTAssertEqual(forged["code"] as? String, "invalidInput")
    XCTAssertTrue(provider.verifyPurposes.isEmpty)
    _ = await service.execute(command: "dispose", payload: "{}")
    let stale = await execute(service, "verifyCode", ["attemptId": handle, "codePurpose": "signIn", "code": "123456"], generation: 3)
    XCTAssertEqual(stale["code"] as? String, "invalidInput")
    XCTAssertEqual(provider.storedSessionId, "sess_1")
    XCTAssertTrue(provider.revoked.isEmpty)
  }

}
