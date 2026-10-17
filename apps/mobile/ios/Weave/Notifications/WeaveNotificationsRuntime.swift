import Foundation
#if os(iOS) && canImport(UIKit)
import UIKit
#endif

@MainActor enum WeaveNotificationsRuntime {
  private(set) static var service: any NotificationExecuting = UnavailableNotificationService()
  private static var configured = false
  static func configure(info: [String: Any], launchOptions: [AnyHashable: Any]?) {
    guard !configured else { return }
    configured = true
    #if os(iOS) && canImport(OneSignalFramework)
    guard let configuration = NotificationConfiguration.read(info) else { return }
    let clock = NotificationSystemClock()
    let sdk = OneSignalNotificationSDK(launchOptions: launchOptions as? [UIApplication.LaunchOptionsKey: Any])
    let authority = WeaveAuthRuntime.notificationAuthority
    let transport = ClerkSessionAuthorizedTransport(origin: configuration.origin, authority: authority, http: NotificationURLHTTPClient(), clock: clock)
    let coordinator = NotificationCoordinator(sdk: sdk, authority: authority, transport: transport, clock: clock, appId: configuration.appId)
    sdk.verifyForeground = { [weak coordinator] in coordinator?.foregroundAuthorized() == true }
    service = coordinator
    #endif
  }
}

@MainActor private final class UnavailableNotificationService: NotificationExecuting {
  var onObservation: ((String) -> Void)?
  func execute(command: String, payload: String) async -> String {
    guard let request = NotificationWire.decode(command, payload) else { return NotificationWire.error("invalid-request") }
    return NotificationWire.error("unavailable", lease: request.lease, generation: request.generation)
  }
}
