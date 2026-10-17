import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationAuthorityTests: XCTestCase {
  @MainActor func testS09NativeIdentityEventsInvalidateWithoutJSButTokenRefreshRetainsAuthority() {
    let provider = NotificationAuthProviderFixture()
    let authority = NativeNotificationSessionAuthority(live: { provider.session }, token: { _, _ in { "native-secret" } })
    authority.validated(provider.session!)
    var invalidations = 0
    _ = authority.observeInvalidation { invalidations += 1 }
    authority.observed(provider.session)
    XCTAssertEqual(invalidations, 0)
    provider.session = .init(sessionId: "session-b", accountId: "account-b", active: true, hasPendingTasks: false)
    authority.observed(provider.session)
    XCTAssertEqual(invalidations, 1)
    authority.validated(provider.session!)
    invalidations = 0
    provider.session = .init(sessionId: "session-b", accountId: "account-b", active: true, hasPendingTasks: true)
    authority.observed(provider.session)
    XCTAssertEqual(invalidations, 1)
  }
  @MainActor func testS04NativeValidatedAuthorityRequiresCurrentTaskFreeIdentityAndOwnEpoch() {
    let provider = NotificationAuthProviderFixture()
    let authority = NativeNotificationSessionAuthority(live: { provider.session }, token: { _, _ in { "native-secret" } })
    let context = NotificationSessionContext(sessionId: "session-a", accountId: "account-a", generation: 999)
    XCTAssertNil(authority.capture(context))
    authority.validated(provider.session!)
    guard let captured = authority.capture(context) else { return XCTFail("Validated native identity must authorize independently of JS generation") }
    XCTAssertTrue(authority.isCurrent(captured))
    authority.invalidate()
    authority.validated(provider.session!)
    XCTAssertFalse(authority.isCurrent(captured))
    provider.session = .init(sessionId: "session-a", accountId: "account-a", active: true, hasPendingTasks: true)
    XCTAssertNil(authority.capture(context))
  }

  @MainActor func testS04PendingNativeSignOutInvalidatesBeforeNetworkCompletion() async {
    let provider = NotificationAuthProviderFixture()
    let authority = NativeNotificationSessionAuthority(live: { provider.session }, token: { _, _ in { "native-secret" } })
    let service = ClerkAuthService(provider: provider, notificationAuthority: authority)
    _ = await service.execute(command: "resolveSession", payload: "{\"generation\":1,\"operationId\":\"resolve\",\"forceFresh\":true}")
    let context = NotificationSessionContext(sessionId: "session-a", accountId: "account-a", generation: 77)
    XCTAssertNotNil(authority.capture(context))
    let logout = Task { await service.execute(command: "signOut", payload: "{\"generation\":2,\"operationId\":\"logout\",\"sessionId\":\"session-a\"}") }
    for _ in 0..<100 where !provider.logoutStarted { await Task.yield() }
    XCTAssertNil(authority.capture(context))
    provider.logoutGate.resolve(true)
    _ = await logout.value
  }
}

@MainActor private final class NotificationAuthProviderFixture: AuthProvider {
  var session: ProviderSession? = .init(sessionId: "session-a", accountId: "account-a", active: true, hasPendingTasks: false)
  var storedSessionId: String? { session?.sessionId }
  var invalidationHandler: (() -> Void)?
  var logoutStarted = false
  let logoutGate = NotificationDeferred<Bool>()
  func abandonAttempts() {}
  func validateSessionFresh() async throws -> ProviderSession? { session }
  func signOut(sessionId: String) async throws { logoutStarted = true; _ = await logoutGate.value(); session = nil }
  func password(email: String, password: String) async throws -> ProviderAttempt { throw AuthFailure.unexpected }
  func requestCode(email: String) async throws -> ProviderAttempt { throw AuthFailure.unexpected }
  func verifyCode(attemptId: String, code: String, purpose: String) async throws -> ProviderAttempt { throw AuthFailure.unexpected }
  func resendCode(attemptId: String, purpose: String) async throws -> ProviderAttempt { throw AuthFailure.unexpected }
  func google(transferable: Bool) async throws -> ProviderAttempt { throw AuthFailure.unexpected }
}
