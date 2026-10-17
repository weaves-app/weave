import Foundation

@objc(WeaveNotificationsEngine)
@MainActor public final class WeaveNotificationsEngine: NSObject {
  @objc public var onNotificationChanged: ((String) -> Void)?
  private let service: any NotificationExecuting
  private var ownedLease: String?
  public override convenience init() { self.init(service: WeaveNotificationsRuntime.service) }
  init(service: any NotificationExecuting) {
    self.service = service
    super.init()
    service.onObservation = { [weak self] in self?.onNotificationChanged?($0) }
  }
  @objc(execute:payload:completion:)
  public func execute(command: String, payload: String, completion: @escaping (String) -> Void) {
    if command == "acquire", let request = NotificationWire.decode(command, payload) { ownedLease = request.lease }
    Task { @MainActor in completion(await service.execute(command: command, payload: payload)) }
  }
  @objc public func invalidate() {
    guard let ownedLease else { return }
    self.ownedLease = nil
    Task { @MainActor in _ = await service.execute(command: "release", payload: NotificationWire.encode(["version": 1, "rootLease": ownedLease, "generation": 0])) }
  }
}
