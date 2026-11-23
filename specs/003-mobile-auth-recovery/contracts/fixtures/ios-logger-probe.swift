import Foundation

@MainActor
final class Clerk {
  struct Options {
    let logLevel: LogLevel = .error
    let loggerHandler: (@Sendable (LogEntry) -> Void)? = nil
  }
  static var installedLoggingConfiguration: ClerkLogger.Configuration? {
    ClerkLogger.Configuration(options: Options())
  }
}

struct SeededError: LocalizedError {
  var errorDescription: String? { "synthetic-sensitive-marker" }
}

@main
struct LoggerProbe {
  @MainActor
  static func main() async {
    var leaked = false
    ClerkLogger.sink = { _, message in
      if message.contains("synthetic-sensitive-marker") { leaked = true }
    }
    await ClerkLogger.error("Synthetic provider error", error: SeededError()).value
    if leaked { print("FAIL: pinned SDK emitted a seeded sensitive value"); exit(1) }
    print(leaked ? "FAIL: pinned SDK emitted the seeded sensitive value at minimum error logging" : "PASS: no seeded value emitted")
  }
}
