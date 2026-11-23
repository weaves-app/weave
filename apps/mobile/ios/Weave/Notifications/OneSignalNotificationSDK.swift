#if os(iOS) && canImport(OneSignalFramework)
import Foundation
import UIKit
import UserNotifications
import OneSignalFramework
import OneSignalUser

@MainActor final class OneSignalNotificationSDK: NSObject, NotificationSDK {
  var onChanged: (() -> Void)?
  var onJwtInvalidated: ((String) -> Void)?
  var verifyForeground: (() -> Bool)?
  private var initialized = false
  private let launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  nonisolated private let presentation = NotificationPresentationAdapter()

  init(launchOptions: [UIApplication.LaunchOptionsKey: Any]?) { self.launchOptions = launchOptions; super.init() }
  func initialize(appId: String) {
    guard !initialized else { return }
    OneSignal.Debug.setLogLevel(.LL_NONE)
    OneSignal.Debug.setAlertLevel(.LL_NONE)
    OneSignal.initialize(appId, withLaunchOptions: launchOptions)
    initialized = true
    OneSignal.User.addObserver(self)
    OneSignal.User.pushSubscription.addObserver(self)
    OneSignal.Notifications.addPermissionObserver(self)
    OneSignal.Notifications.addForegroundLifecycleListener(self)
    OneSignal.Notifications.addClickListener(self)
    OneSignal.addUserJwtInvalidatedListener(self)
  }
  var installation: NotificationInstallation {
    .init(subscriptionId: initialized ? OneSignal.User.pushSubscription.id : nil,
      token: initialized ? OneSignal.User.pushSubscription.token : nil,
      externalId: initialized ? OneSignal.User.externalId : nil,
      optedIn: initialized && OneSignal.User.pushSubscription.optedIn,
      permission: nativePermission())
  }
  private func nativePermission() -> NotificationPlatformPermission {
    guard initialized else { return .init(status: .unavailable, canRequest: false) }
    let status: NotificationAuthorizationStatus
    switch OneSignal.Notifications.permissionNative {
    case .notDetermined: status = .notDetermined
    case .authorized: status = .authorized
    case .denied: status = .denied
    case .provisional: status = .provisional
    case .ephemeral: status = .ephemeral
    @unknown default: status = .unavailable
    }
    return .init(status: status, canRequest: OneSignal.Notifications.canRequestPermission)
  }
  func permission() async throws -> NotificationPlatformPermission {
    guard initialized else { return .init(status: .unavailable, canRequest: false) }
    let settings = await UNUserNotificationCenter.current().notificationSettings()
    let status: NotificationAuthorizationStatus
    switch settings.authorizationStatus {
    case .notDetermined: status = .notDetermined
    case .authorized: status = .authorized
    case .denied: status = .denied
    case .provisional: status = .provisional
    case .ephemeral: status = .ephemeral
    @unknown default: status = .unavailable
    }
    return .init(status: status, canRequest: OneSignal.Notifications.canRequestPermission)
  }
  func requestPermission() async throws {
    guard initialized else { return }
    await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
      OneSignal.Notifications.requestPermission({ _ in continuation.resume() }, fallbackToSettings: false)
    }
  }
  func optIn() async throws { if initialized { OneSignal.User.pushSubscription.optIn() } }
  func openSettings() async throws {
    guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else { return }
    _ = await UIApplication.shared.open(url)
  }
  func login(accountId: String, token: String) { if initialized { OneSignal.login(externalId: accountId, token: token) } }
  func logout() { presentation.setAllowed(false); if initialized { OneSignal.logout() } }
  func setForegroundAllowed(_ allowed: Bool) { presentation.setAllowed(allowed) }
}

extension OneSignalNotificationSDK: OSUserStateObserver, OSPushSubscriptionObserver, OSNotificationPermissionObserver, OSNotificationLifecycleListener, OSNotificationClickListener, OSUserJwtInvalidatedListener {
  nonisolated func onUserStateDidChange(state: OSUserChangedState) { Task { @MainActor [weak self] in self?.onChanged?() } }
  nonisolated func onPushSubscriptionDidChange(state: OSPushSubscriptionChangedState) { Task { @MainActor [weak self] in self?.onChanged?() } }
  nonisolated func onNotificationPermissionDidChange(_ permission: Bool) { Task { @MainActor [weak self] in self?.onChanged?() } }
  nonisolated func onUserJwtInvalidated(event: OSUserJwtInvalidatedEvent) {
    let account = event.externalId
    Task { @MainActor [weak self] in self?.onJwtInvalidated?(account) }
  }
  nonisolated func onWillDisplay(event: OSNotificationWillDisplayEvent) {
    // The SDK displays immediately after return. Validate synchronously, including live auth.
    let allowed: Bool
    if Thread.isMainThread { allowed = MainActor.assumeIsolated { verifyForeground?() ?? false } }
    else { allowed = DispatchQueue.main.sync { MainActor.assumeIsolated { verifyForeground?() ?? false } } }
    presentation.setAllowed(allowed)
    presentation.foreground { event.preventDefault() }
  }
  nonisolated func onClick(event: OSNotificationClickEvent) { _ = presentation.openDisposition(nil) }
}
#endif
