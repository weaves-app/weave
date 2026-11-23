import Foundation
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

@MainActor final class NotificationTestClock: NotificationClock {
  var time: TimeInterval = 900000
  var milliseconds: Double { time * 1000 }
  var date: Date { Date(timeIntervalSince1970: time) }
  private var callbacks: [UUID: (TimeInterval, () -> Void)] = [:]
  func schedule(after seconds: TimeInterval, _ callback: @escaping () -> Void) -> () -> Void {
    let key = UUID(); callbacks[key] = (time + seconds, callback)
    return { self.callbacks[key] = nil }
  }
  func advance(_ seconds: TimeInterval) {
    time += seconds
    let due = callbacks.filter { $0.value.0 <= time }
    for (key, value) in due { callbacks[key] = nil; value.1() }
  }
}

/// Controlled native boundary completion shared by notification race tests.
@MainActor final class NotificationDeferred<Value: Sendable> {
  private var result: Value?
  private var waiters: [CheckedContinuation<Value, Never>] = []

  func value() async -> Value {
    if let result { return result }
    return await withCheckedContinuation { waiters.append($0) }
  }

  func resolve(_ value: Value) {
    if case .some = result { return }
    result = value
    let pending = waiters
    waiters.removeAll()
    pending.forEach { $0.resume(returning: value) }
  }
}
