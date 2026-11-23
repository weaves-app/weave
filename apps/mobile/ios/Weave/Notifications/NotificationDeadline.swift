import Foundation

@MainActor final class NotificationSystemClock: NotificationClock {
  var milliseconds: Double { ProcessInfo.processInfo.systemUptime * 1000 }
  var date: Date { Date() }
  func schedule(after seconds: TimeInterval, _ callback: @escaping () -> Void) -> () -> Void {
    let task = Task { @MainActor in
      do { try await Task.sleep(for: .seconds(seconds)); callback() }
      catch {}
    }
    return { task.cancel() }
  }
}

@MainActor final class NotificationDeadline {
  private let clock: any NotificationClock
  init(clock: any NotificationClock) { self.clock = clock }
  func run<Value: Sendable>(_ operation: @escaping @MainActor () async -> Value) async -> Value? {
    await withCheckedContinuation { continuation in
      let completion = NotificationDeadlineCompletion(continuation)
      completion.cancelTimer = clock.schedule(after: 5) { completion.finish(nil) }
      completion.task = Task { @MainActor in completion.finish(await operation()) }
    }
  }
}

@MainActor private final class NotificationDeadlineCompletion<Value: Sendable> {
  private var continuation: CheckedContinuation<Value?, Never>?
  var cancelTimer: (() -> Void)?
  var task: Task<Void, Never>?
  init(_ continuation: CheckedContinuation<Value?, Never>) { self.continuation = continuation }
  func finish(_ value: Value?) {
    guard let continuation else { return }
    self.continuation = nil
    cancelTimer?(); cancelTimer = nil
    task?.cancel(); task = nil
    continuation.resume(returning: value)
  }
}
