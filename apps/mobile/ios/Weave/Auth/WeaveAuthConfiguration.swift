import Foundation

struct WeaveAuthConfiguration {
  let publishableKey: String
  let callbackScheme: String
  let callbackURL: String
  static func read(_ info: [String: Any]) -> WeaveAuthConfiguration? {
    guard let key = info["WeaveClerkPublishableKey"] as? String,
          key.hasPrefix("pk_test_") || key.hasPrefix("pk_live_"),
          let scheme = info["WeaveAuthCallbackScheme"] as? String,
          scheme.range(of: "^[A-Za-z][A-Za-z0-9+.-]*$", options: .regularExpression) != nil,
          let callback = info["WeaveAuthCallbackURL"] as? String,
          let url = URLComponents(string: callback), url.scheme == scheme,
          url.host == "callback", url.path.isEmpty, url.query == nil, url.fragment == nil else { return nil }
    var encoded = String(key.dropFirst(8)).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    encoded += String(repeating: "=", count: (4 - encoded.count % 4) % 4)
    guard let data = Data(base64Encoded: encoded), let decoded = String(data: data, encoding: .utf8),
          decoded.hasSuffix("$"),
          decoded.dropLast().range(of: "^[A-Za-z0-9]+[A-Za-z0-9.-]*\\.[A-Za-z0-9.-]+$", options: .regularExpression) != nil else { return nil }
    return WeaveAuthConfiguration(publishableKey: key, callbackScheme: scheme, callbackURL: callback)
  }
}
