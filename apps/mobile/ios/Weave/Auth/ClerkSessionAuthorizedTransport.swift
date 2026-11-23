import Foundation

@MainActor final class ClerkSessionAuthorizedTransport: SessionAuthorizedTransport {
  private let origin: URL
  private let authority: any NotificationSessionAuthority
  private let http: any NotificationHTTPClient
  private let deadline: NotificationDeadline
  init(origin: URL, authority: any NotificationSessionAuthority, http: any NotificationHTTPClient, clock: any NotificationClock) {
    self.origin = origin; self.authority = authority; self.http = http
    deadline = NotificationDeadline(clock: clock)
  }
  func execute(context: NotificationSessionContext, operation: NotificationHttpOperation) async -> NotificationHttpResult {
    guard let components = URLComponents(url: origin, resolvingAgainstBaseURL: false),
          components.scheme == "https", components.host?.isEmpty == false,
          components.user == nil, components.password == nil, components.query == nil, components.fragment == nil,
          components.path.isEmpty || components.path == "/" else { return .unavailable }
    let path: String
    let body: [String: String]
    switch operation {
    case .identityGrant: path = "api/notifications/identity-grant"; body = [:]
    case .readiness(let subscriptionId, let platform):
      guard UUID(uuidString: subscriptionId)?.uuidString.lowercased() == subscriptionId.lowercased(), platform == "ios" else { return .unavailable }
      path = "api/notifications/readiness"; body = ["subscriptionId": subscriptionId, "platform": platform]
    }
    guard let captured = authority.capture(context) else { return .stale }
    let token = await deadline.run { try? await captured.token() }
    guard authority.isCurrent(captured) else { return .stale }
    guard let token = token ?? nil, !token.isEmpty, !Task.isCancelled else { return .unavailable }
    var request = URLRequest(url: origin.appendingPathComponent(path))
    request.httpMethod = "POST"
    request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.timeoutInterval = 5
    request.cachePolicy = .reloadIgnoringLocalCacheData
    let response = await deadline.run { [http] in try? await http.send(request, maximumBytes: 16384) }
    guard authority.isCurrent(captured) else { return .stale }
    guard let response = response ?? nil, response.body.count <= 16384,
          !(300..<400).contains(response.status), !Task.isCancelled else { return .unavailable }
    return .response(status: response.status, body: response.body)
  }
}
