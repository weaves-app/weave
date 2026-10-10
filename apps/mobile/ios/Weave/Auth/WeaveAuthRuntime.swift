import Foundation
import ClerkKit

@MainActor
enum WeaveAuthRuntime {
  private(set) static var service: any WeaveAuthExecuting = UnavailableAuthService()
  private static var configured = false

  static func configure(info: [String: Any]) {
    guard !configured, let configuration = WeaveAuthConfiguration.read(info) else { return }
    let clerk = Clerk.configure(publishableKey: configuration.publishableKey, options: .init(
      logLevel: .error, telemetryEnabled: false,
      keychainConfig: .init(service: Bundle.main.bundleIdentifier ?? "si.tryweave.auth"),
      redirectConfig: .init(redirectUrl: configuration.callbackURL, callbackUrlScheme: configuration.callbackScheme)
    ))
    service = ClerkAuthService(provider: ClerkProvider(clerk: clerk))
    configured = true
  }
}
