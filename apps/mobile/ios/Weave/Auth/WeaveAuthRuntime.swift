import Foundation
import ClerkKit

@MainActor
enum WeaveAuthRuntime {
  private(set) static var service: any WeaveAuthExecuting = UnavailableAuthService()
  private static var configured = false
  private static var notificationObservation: Task<Void, Never>?
  private(set) static var notificationAuthority = NativeNotificationSessionAuthority(live: { nil }, token: { _, _ in nil })

  static func configure(info: [String: Any]) {
    guard !configured, let configuration = WeaveAuthConfiguration.read(info) else { return }
    let clerk = Clerk.configure(publishableKey: configuration.publishableKey, options: .init(
      logLevel: .error, telemetryEnabled: false,
      keychainConfig: .init(service: Bundle.main.bundleIdentifier ?? "si.tryweave.auth"),
      redirectConfig: .init(redirectUrl: configuration.callbackURL, callbackUrlScheme: configuration.callbackScheme)
    ))
    notificationAuthority = NativeNotificationSessionAuthority(live: {
      guard let session = clerk.session else { return nil }
      return .init(sessionId: session.id, accountId: session.user?.id ?? "", active: session.status == .active && clerk.isAuthFlowComplete, hasPendingTasks: !(session.tasks ?? []).isEmpty)
    }, token: { sessionId, accountId in
      guard let captured = clerk.session, captured.id == sessionId, captured.user?.id == accountId,
            captured.status == .active, (captured.tasks ?? []).isEmpty, clerk.isAuthFlowComplete else { return nil }
      return { try await captured.getToken(.init()) }
    })
    service = ClerkAuthService(provider: ClerkProvider(clerk: clerk), notificationAuthority: notificationAuthority)
    let events = clerk.auth.events
    notificationObservation = Task { @MainActor in
      for await event in events {
        guard !Task.isCancelled else { return }
        switch event {
        case .sessionChanged:
          let current = clerk.session.map { session in
            ProviderSession(sessionId: session.id, accountId: session.user?.id ?? "", active: session.status == .active && clerk.isAuthFlowComplete, hasPendingTasks: !(session.tasks ?? []).isEmpty)
          }
          notificationAuthority.observed(current)
        case .accountDeleted: notificationAuthority.invalidate()
        case .signedOut(let session):
          if clerk.session == nil || clerk.session?.id == session.id { notificationAuthority.invalidate() }
        default: break
        }
      }
    }
    configured = true
  }
}
