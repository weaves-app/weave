import Foundation

struct NotificationConfiguration {
  let appId: String
  let origin: URL
  static func read(_ info: [String: Any]) -> NotificationConfiguration? {
    guard let appId = info["WeaveOneSignalAppId"] as? String, UUID(uuidString: appId) != nil,
          info["OneSignal_suppress_launch_urls"] as? Bool == true,
          let value = info["WeaveNotificationsAPIOrigin"] as? String,
          let parts = URLComponents(string: value), parts.scheme == "https", parts.host?.isEmpty == false,
          parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
          parts.path.isEmpty || parts.path == "/", let origin = parts.url else { return nil }
    return .init(appId: appId, origin: origin)
  }
}
