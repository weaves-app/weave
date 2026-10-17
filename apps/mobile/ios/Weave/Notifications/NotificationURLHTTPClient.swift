import Foundation

@MainActor final class NotificationURLHTTPClient: NotificationHTTPClient {
  private let configuration: URLSessionConfiguration
  init(configuration: URLSessionConfiguration = .ephemeral) {
    self.configuration = configuration
    configuration.urlCache = nil; configuration.httpCookieStorage = nil; configuration.httpShouldSetCookies = false
    configuration.timeoutIntervalForRequest = 5; configuration.timeoutIntervalForResource = 5
  }
  func send(_ request: URLRequest, maximumBytes: Int) async throws -> NotificationHTTPResponse {
    let session = URLSession(configuration: configuration, delegate: NotificationRedirectBlocker(), delegateQueue: nil)
    defer { session.invalidateAndCancel() }
    let (bytes, response) = try await session.bytes(for: request)
    guard let response = response as? HTTPURLResponse, !(300..<400).contains(response.statusCode) else { throw URLError(.badServerResponse) }
    var body = Data()
    for try await byte in bytes {
      guard body.count < maximumBytes else { throw URLError(.dataLengthExceedsMaximum) }
      body.append(byte)
    }
    return .init(status: response.statusCode, body: body)
  }
}

private final class NotificationRedirectBlocker: NSObject, URLSessionTaskDelegate, Sendable {
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping @Sendable (URLRequest?) -> Void) { completionHandler(nil) }
}
