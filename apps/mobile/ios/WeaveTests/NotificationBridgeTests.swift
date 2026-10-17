import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationBridgeTests: XCTestCase {
  @MainActor func testS03S10NativeBridgeDispatchesWireAndOnlyEmitsSanitizedObservations() async {
    let fixture = CoordinatorFixture()
    let engine = WeaveNotificationsEngine(service: fixture.coordinator)
    var events: [String] = []
    engine.onNotificationChanged = { events.append($0) }
    _ = await execute(engine, "acquire", ["version": 1, "rootLease": "root-a", "generation": 0])
    let result = await execute(engine, "reconcile", ["version": 1, "rootLease": "root-a", "generation": 7, "sessionId": "session-a", "accountId": "account-a"])
    XCTAssertTrue(result.contains("observation"))
    XCTAssertEqual(fixture.sdk.logins.count, 1)
    fixture.sdk.onChanged?()
    XCTAssertFalse(events.isEmpty)
    for value in events + [result] {
      XCTAssertTrue(value.contains("observation"))
      for privateValue in ["push-secret", "identity-secret", "account-a", fixture.sdk.subscriptionId] { XCTAssertFalse(value.contains(privateValue)) }
    }
    let denied = await execute(engine, "login", ["version": 1, "rootLease": "root-a", "generation": 7, "sessionId": "session-a", "accountId": "account-a"])
    XCTAssertTrue(denied.contains("invalid-request"))
    XCTAssertEqual(fixture.sdk.logins.count, 1)
  }
  @MainActor private func execute(_ engine: WeaveNotificationsEngine, _ command: String, _ body: [String: Any]) async -> String {
    await withCheckedContinuation { continuation in
      engine.execute(command: command, payload: NotificationWire.encode(body)) { continuation.resume(returning: $0) }
    }
  }
}
