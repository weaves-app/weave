#if WEAVE_LOGGER_PROBE
import Foundation

final class LogCapture: @unchecked Sendable {
  private let lock = NSLock()
  private var content: [String] = []
  func append(_ message: String) {
    lock.lock()
    defer { lock.unlock() }
    content.append(message)
  }
  func hasSensitiveValue() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return content.contains { $0.contains("weave-seeded-secret") }
  }
}

@MainActor
final class Clerk {
  struct Options {
    let logLevel: LogLevel = .error
    let loggerHandler: (@Sendable (LogEntry) -> Void)? = { entry in
      capture.append(entry.message)
      if let error = entry.error { capture.append(String(describing: error)) }
    }
  }
  static var installedLoggingConfiguration: ClerkLogger.Configuration? {
    ClerkLogger.Configuration(options: Options())
  }
}

let capture = LogCapture()
struct SeededError: LocalizedError {
  var errorDescription: String? { "weave-seeded-secret" }
  var failureReason: String? { "weave-seeded-secret" }
}

@main
struct ClerkLoggingPrivacyProbe {
  @MainActor
  static func main() async {
    ClerkLogger.sink = { _, value in capture.append(value) }
    await ClerkLogger.error("weave-seeded-secret", error: SeededError()).value
    guard !capture.hasSensitiveValue() else {
      print("FAIL: SDK diagnostic sink or handler exposed seeded data")
      exit(1)
    }
    print("PASS: SDK diagnostic sink and handler redact seeded message/error")
  }
}
#endif
