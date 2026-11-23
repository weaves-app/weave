import Foundation

final class NotificationPresentationAdapter: @unchecked Sendable {
  private let lock = NSLock()
  private var allowed = false
  func setAllowed(_ allowed: Bool) { lock.withLock { self.allowed = allowed } }
  func foreground(preventDefault: () -> Void) { if !lock.withLock({ allowed }) { preventDefault() } }
  func openDisposition(_ payload: Any?) -> String { "ignore" }
}
