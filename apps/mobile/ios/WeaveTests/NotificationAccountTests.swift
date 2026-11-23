import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationAccountTests: XCTestCase {
  @MainActor func testS03TransportUsesOnlyCapturedNativeBearerAndFixedEndpoint() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    let transport = makeTransport(authority, http)
    let result = await transport.execute(context: authority.context, operation: .identityGrant)
    XCTAssertEqual(http.requests.count, 1)
    XCTAssertEqual(http.requests.first?.url?.absoluteString, "https://api.example.test/api/notifications/identity-grant")
    XCTAssertEqual(http.requests.first?.value(forHTTPHeaderField: "Authorization"), "Bearer native-secret")
    XCTAssertEqual(http.requests.first?.httpBody, Data("{}".utf8))
    guard case .response(let status, _) = result else { return XCTFail("Expected native-only response") }
    XCTAssertEqual(status, 200)
  }

  @MainActor func testS04TokenPausedAcrossAccountSwitchNeverStartsHTTP() async {
    let authority = NotificationAuthorityFixture()
    authority.pauseToken = true
    let http = NotificationHTTPFixture()
    let transport = makeTransport(authority, http)
    let request = Task { await transport.execute(context: authority.context, operation: .identityGrant) }
    for _ in 0..<100 where authority.tokenRequests == 0 { await Task.yield() }
    authority.invalidate()
    authority.tokenGate.resolve("old-account-secret")
    let result = await request.value
    guard case .stale = result else { return XCTFail("Expected stale captured authority") }
    XCTAssertTrue(http.requests.isEmpty)
  }

  @MainActor func testS04HTTPPausedAcrossAToBToARejectsOldNativeEpoch() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    http.pause = true
    let transport = makeTransport(authority, http)
    let request = Task { await transport.execute(context: authority.context, operation: .identityGrant) }
    for _ in 0..<100 where http.requests.isEmpty { await Task.yield() }
    authority.invalidate()
    authority.active = true
    http.gate.resolve(.init(status: 200, body: Data("old-grant".utf8)))
    let result = await request.value
    guard case .stale = result else { return XCTFail("Same account IDs cannot restore an old epoch") }
  }

  @MainActor func testS04WrongNativeIdentityAndMissingTokenFailClosed() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    let transport = makeTransport(authority, http)
    let wrong = NotificationSessionContext(sessionId: "forged-session", accountId: "other", generation: 1)
    _ = await transport.execute(context: wrong, operation: .identityGrant)
    authority.tokenValue = nil
    let result = await transport.execute(context: authority.context, operation: .identityGrant)
    guard case .unavailable = result else { return XCTFail("Missing token must be unavailable") }
    XCTAssertTrue(http.requests.isEmpty)
  }

  @MainActor func testS04UntrustedOriginsAndInvalidReadinessInputsNeverSend() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    for origin in ["http://api.example.test", "https://name:password@api.example.test", "https://api.example.test/path", "https://api.example.test?next=secret"] {
      let transport = ClerkSessionAuthorizedTransport(origin: URL(string: origin)!, authority: authority, http: http, clock: NotificationTestClock())
      _ = await transport.execute(context: authority.context, operation: .identityGrant)
    }
    _ = await makeTransport(authority, http).execute(context: authority.context, operation: .readiness(subscriptionId: "not-a-uuid", platform: "ios"))
    XCTAssertTrue(http.requests.isEmpty)
  }

  @MainActor func testS04OversizedSuccessAndErrorResponsesAreUnavailable() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    for status in [200, 503] {
      http.response = .init(status: status, body: Data(repeating: 65, count: 16385))
      let result = await makeTransport(authority, http).execute(context: authority.context, operation: .identityGrant)
      guard case .unavailable = result else { return XCTFail("Decoded response cap applies before parsing") }
    }
    XCTAssertEqual(http.maximumBytes, 16384)
  }

  @MainActor func testS04TokenDeadlineReturnsWithoutWaitingForNoncooperativeSDK() async {
    let authority = NotificationAuthorityFixture()
    authority.pauseToken = true
    let http = NotificationHTTPFixture()
    let clock = NotificationTestClock()
    let transport = ClerkSessionAuthorizedTransport(origin: URL(string: "https://api.example.test")!, authority: authority, http: http, clock: clock)
    let request = Task { await transport.execute(context: authority.context, operation: .identityGrant) }
    for _ in 0..<100 where authority.tokenRequests == 0 { await Task.yield() }
    clock.advance(5)
    let result = await request.value
    guard case .unavailable = result else { return XCTFail("Token deadline must return safely") }
    authority.tokenGate.resolve("late-secret")
    for _ in 0..<10 { await Task.yield() }
    XCTAssertTrue(http.requests.isEmpty)
  }

  @MainActor func testS04HTTPHasItsOwnFiveSecondDeadline() async {
    let authority = NotificationAuthorityFixture()
    let http = NotificationHTTPFixture()
    http.pause = true
    let clock = NotificationTestClock()
    let transport = ClerkSessionAuthorizedTransport(origin: URL(string: "https://api.example.test")!, authority: authority, http: http, clock: clock)
    let request = Task { await transport.execute(context: authority.context, operation: .identityGrant) }
    for _ in 0..<100 where http.requests.isEmpty { await Task.yield() }
    clock.advance(5)
    let result = await request.value
    guard case .unavailable = result else { return XCTFail("HTTP deadline must return safely") }
    http.gate.resolve(.init(status: 200, body: Data()))
    XCTAssertEqual(http.requests.count, 1)
  }

  @MainActor private func makeTransport(_ authority: NotificationAuthorityFixture, _ http: NotificationHTTPFixture) -> ClerkSessionAuthorizedTransport {
    ClerkSessionAuthorizedTransport(origin: URL(string: "https://api.example.test")!, authority: authority, http: http, clock: NotificationTestClock())
  }
}

@MainActor final class NotificationAuthorityFixture: NotificationSessionAuthority {
  var context = NotificationSessionContext(sessionId: "session-a", accountId: "account-a", generation: 7)
  var epoch = 1
  var active = true
  var tokenValue: String? = "native-secret"
  var tokenRequests = 0
  var pauseToken = false
  let tokenGate = NotificationDeferred<String?>()
  private var observers: [UUID: () -> Void] = [:]
  func capture(_ context: NotificationSessionContext) -> NotificationSessionCapture? {
    guard active, context.sessionId == self.context.sessionId, context.accountId == self.context.accountId else { return nil }
    return .init(sessionId: context.sessionId, accountId: context.accountId, epoch: epoch, token: { [self] in
      tokenRequests += 1
      return pauseToken ? await tokenGate.value() : tokenValue
    })
  }
  func isCurrent(_ capture: NotificationSessionCapture) -> Bool { active && capture.epoch == epoch }
  func observeInvalidation(_ callback: @escaping () -> Void) -> () -> Void {
    let key = UUID(); observers[key] = callback
    return { self.observers[key] = nil }
  }
  func invalidate() { epoch += 1; active = false; Array(observers.values).forEach { $0() } }
}

@MainActor final class NotificationHTTPFixture: NotificationHTTPClient {
  var requests: [URLRequest] = []
  var maximumBytes = 0
  var response = NotificationHTTPResponse(status: 200, body: Data("{}".utf8))
  var pause = false
  let gate = NotificationDeferred<NotificationHTTPResponse>()
  func send(_ request: URLRequest, maximumBytes: Int) async throws -> NotificationHTTPResponse {
    requests.append(request); self.maximumBytes = maximumBytes
    return pause ? await gate.value() : response
  }
}
