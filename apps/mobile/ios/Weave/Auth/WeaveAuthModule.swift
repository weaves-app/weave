import Foundation

@MainActor
protocol WeaveAuthExecuting: AnyObject {
  var onSnapshot: ((String) -> Void)? { get set }
  func execute(command: String, payload: String) async -> String
}

@MainActor
final class UnavailableAuthService: WeaveAuthExecuting {
  var onSnapshot: ((String) -> Void)?
  func execute(command: String, payload: String) async -> String {
    return "{\"kind\":\"error\",\"code\":\"configuration\"}"
  }
}

@objc(WeaveAuthEngine)
@MainActor
public final class WeaveAuthEngine: NSObject {
  @objc public var onSessionChanged: ((String) -> Void)?
  private var operations: [String: Task<Void, Never>] = [:]
  private let service: any WeaveAuthExecuting

  public override init() {
    service = WeaveAuthRuntime.service
    super.init()
    self.service.onSnapshot = { [weak self] value in self?.onSessionChanged?(value) }
  }

  init(service: any WeaveAuthExecuting) {
    self.service = service
    super.init()
    self.service.onSnapshot = { [weak self] value in self?.onSessionChanged?(value) }
  }

  @objc(execute:payload:completion:)
  public func execute(command: String, payload: String, completion: @escaping (String) -> Void) {
    let inputs = payload.data(using: .utf8).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
    let operationId = inputs?["operationId"] as? String
    if command == "abandon" || command == "dispose" {
      Task { @MainActor in
        let result = await service.execute(command: command, payload: payload)
        if command == "dispose" {
          operations.values.forEach { $0.cancel() }
        } else if let operationId { operations[operationId]?.cancel() }
        completion(result)
      }
      return
    }
    let operation = Task { @MainActor in
      let result = await service.execute(command: command, payload: payload)
      if let operationId { operations.removeValue(forKey: operationId) }
      completion(result)
    }
    if let operationId { operations[operationId] = operation }
  }
}
