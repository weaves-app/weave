import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class WeaveAuthModuleTests: XCTestCase {
  @MainActor
  func testShellNeverGrantsAccessWithoutConfiguredAuthentication() async {
    let module = WeaveAuthEngine()
    let result = await withCheckedContinuation { continuation in
      module.execute(command: "resolveSession", payload: "{}") { result in
        continuation.resume(returning: result)
      }
    }
    let value = try? JSONSerialization.jsonObject(with: Data(result.utf8)) as? [String: String]
    XCTAssertEqual(value?["kind"], "error")
    XCTAssertEqual(value?["code"], "configuration")
    XCTAssertNil(value?["sessionId"])
  }

  @MainActor
  func testAbandonCancelsTheTaskOwningExternalAuthentication() async {
    let service = CancellableAuthFixture()
    let module = WeaveAuthEngine(service: service)
    module.execute(command: "google", payload: "{\"operationId\":\"pending\",\"generation\":1}") { _ in }
    for _ in 0..<100 where !service.started { await Task.yield() }
    XCTAssertTrue(service.started)
    module.execute(command: "abandon", payload: "{\"operationId\":\"pending\",\"generation\":1}") { _ in }
    for _ in 0..<100 where !service.cancelled { await Task.yield() }
    XCTAssertTrue(service.cancelled)
    service.finish = true
  }

}


@MainActor
private final class CancellableAuthFixture: WeaveAuthExecuting {
  var onSnapshot: ((String) -> Void)?
  var started = false
  var cancelled = false
  var finish = false
  func execute(command: String, payload: String) async -> String {
    if command == "google" {
      started = true
      while !Task.isCancelled && !finish { await Task.yield() }
      cancelled = Task.isCancelled
    }
    return "{\"kind\":\"error\",\"code\":\"cancelled\"}"
  }
}
