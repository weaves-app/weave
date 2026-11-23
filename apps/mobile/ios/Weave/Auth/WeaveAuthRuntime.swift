import Foundation
import ClerkKit

@MainActor
enum WeaveAuthRuntime {
  private(set) static var service: any WeaveAuthExecuting = UnavailableAuthService()
  private static var configured = false

  static func configure(info: [String: Any]) {
    guard !configured, let configuration = WeaveAuthConfiguration.read(info) else { return }
    let serviceName = Bundle.main.bundleIdentifier ?? "si.tryweave.auth"
    let clerk = Clerk.configure(publishableKey: configuration.publishableKey, options: .init(
      logLevel: .error, telemetryEnabled: false,
      keychainConfig: .init(service: serviceName),
      redirectConfig: .init(redirectUrl: configuration.callbackURL, callbackUrlScheme: configuration.callbackScheme)
    ))
    let store = KeychainObsoleteSessionStore(access: SystemKeychainAccess(service: serviceName, accessGroup: nil))
    service = ClerkAuthService(provider: ClerkProvider(clerk: clerk), obsoleteSessionStore: store)
    configured = true
  }
}
