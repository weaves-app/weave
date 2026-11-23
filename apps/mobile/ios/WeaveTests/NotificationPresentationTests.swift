import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationPresentationTests: XCTestCase {
  func testS05MissingOrInvalidConfigurationDisablesSetup() {
    XCTAssertNil(NotificationConfiguration.read([:]))
    for origin in ["http://example.test", "https://user:secret@example.test", "https://example.test/path", "https://example.test?url=secret"] {
      XCTAssertNil(NotificationConfiguration.read(["WeaveOneSignalAppId": "a791289b-4d11-40dc-b24f-1f82a329d335", "WeaveNotificationsAPIOrigin": origin, "OneSignal_suppress_launch_urls": true]))
    }
    let config = NotificationConfiguration.read(["WeaveOneSignalAppId": "a791289b-4d11-40dc-b24f-1f82a329d335", "WeaveNotificationsAPIOrigin": "https://example.test", "OneSignal_suppress_launch_urls": true])
    XCTAssertNotNil(config)
  }
  func testS05DefaultForegroundDisplayIsPreservedOnceAndSignedOutIsSuppressedSynchronously() {
    let adapter = NotificationPresentationAdapter()
    var prevented = 0
    adapter.foreground { prevented += 1 }
    XCTAssertEqual(prevented, 1)
    adapter.setAllowed(true)
    adapter.foreground { prevented += 1 }
    XCTAssertEqual(prevented, 1)
    adapter.setAllowed(false)
    adapter.foreground { prevented += 1 }
    XCTAssertEqual(prevented, 2)
  }
  func testS06S07UntrustedTapPayloadsAlwaysUseOrdinaryAppOpen() {
    let adapter = NotificationPresentationAdapter()
    for payload: Any in [NSNull(), "https://evil.test/private", ["url": "weave://auth", "accountId": "other"], ["navigation": "Home"]] {
      XCTAssertEqual(adapter.openDisposition(payload), "ignore")
    }
  }
}

final class NotificationHTTPIntegrationTests: XCTestCase {
  @MainActor func testS04RealStreamingClientAcceptsSmallResponseAndCapsDecodedSuccessAndErrorBodies() async throws {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [NotificationURLProtocol.self]
    let client = NotificationURLHTTPClient(configuration: config)
    NotificationURLProtocol.body = Data("{}".utf8)
    let response = try await client.send(URLRequest(url: URL(string: "https://transport.test")!), maximumBytes: 16384)
    XCTAssertEqual(response.body, Data("{}".utf8))
    for status in [200, 503] {
      NotificationURLProtocol.status = status
      NotificationURLProtocol.body = Data(repeating: 65, count: 16385)
      do { _ = try await client.send(URLRequest(url: URL(string: "https://transport.test")!), maximumBytes: 16384); XCTFail("Expected bounded streaming failure") }
      catch {}
    }
  }
  @MainActor func testS04RedirectResponseIsRejectedByRealHTTPBoundary() async throws {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [NotificationURLProtocol.self]
    NotificationURLProtocol.status = 302; NotificationURLProtocol.body = Data()
    do { _ = try await NotificationURLHTTPClient(configuration: config).send(URLRequest(url: URL(string: "https://transport.test")!), maximumBytes: 16384); XCTFail("Redirect cannot authorize another origin") }
    catch {}
    NotificationURLProtocol.status = 200
  }
}

private final class NotificationURLProtocol: URLProtocol, @unchecked Sendable {
  nonisolated(unsafe) static var body = Data()
  nonisolated(unsafe) static var status = 200
  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: "HTTP/1.1", headerFields: [:])!, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: Self.body)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}
