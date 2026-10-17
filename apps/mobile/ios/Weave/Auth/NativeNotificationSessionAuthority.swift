import Foundation

@MainActor final class NativeNotificationSessionAuthority: NotificationSessionAuthority {
  private let live: () -> ProviderSession?
  private let token: (String, String) -> (@MainActor () async throws -> String?)?
  private var session: ProviderSession?
  private var epoch = 0
  private var observers: [UUID: () -> Void] = [:]
  init(live: @escaping () -> ProviderSession?, token: @escaping (String, String) -> (@MainActor () async throws -> String?)?) { self.live = live; self.token = token }
  func validated(_ session: ProviderSession) { invalidate(); self.session = session }
  func observed(_ current: ProviderSession?) {
    guard let session else { return }
    guard let current, current.active, !current.hasPendingTasks,
          current.sessionId == session.sessionId, current.accountId == session.accountId else { invalidate(); return }
  }
  func invalidate() { epoch += 1; session = nil; Array(observers.values).forEach { $0() } }
  func capture(_ context: NotificationSessionContext) -> NotificationSessionCapture? {
    guard let session, let live = live(), session.active, !session.hasPendingTasks, live.active, !live.hasPendingTasks,
          session.sessionId == context.sessionId, session.accountId == context.accountId,
          live.sessionId == session.sessionId, live.accountId == session.accountId,
          let token = token(session.sessionId, session.accountId) else { return nil }
    return .init(sessionId: session.sessionId, accountId: session.accountId, epoch: epoch, token: token)
  }
  func isCurrent(_ capture: NotificationSessionCapture) -> Bool {
    capture.epoch == epoch && self.capture(.init(sessionId: capture.sessionId, accountId: capture.accountId, generation: 0)) != nil
  }
  func observeInvalidation(_ callback: @escaping () -> Void) -> () -> Void {
    let key = UUID(); observers[key] = callback
    return { [weak self] in self?.observers[key] = nil }
  }
}
