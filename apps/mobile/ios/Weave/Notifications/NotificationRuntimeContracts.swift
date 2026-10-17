import Foundation

struct NotificationSessionCapture {
  let sessionId: String
  let accountId: String
  let epoch: Int
  let token: @MainActor () async throws -> String?
}

@MainActor protocol NotificationSessionAuthority: AnyObject {
  func capture(_ context: NotificationSessionContext) -> NotificationSessionCapture?
  func isCurrent(_ capture: NotificationSessionCapture) -> Bool
  func observeInvalidation(_ callback: @escaping () -> Void) -> () -> Void
}

@MainActor protocol NotificationClock: AnyObject {
  var milliseconds: Double { get }
  var date: Date { get }
  func schedule(after seconds: TimeInterval, _ callback: @escaping () -> Void) -> () -> Void
}

struct NotificationHTTPResponse: Sendable {
  let status: Int
  let body: Data
}

@MainActor protocol NotificationHTTPClient {
  func send(_ request: URLRequest, maximumBytes: Int) async throws -> NotificationHTTPResponse
}

struct NotificationInstallation: Equatable {
  let subscriptionId: String?
  let token: String?
  let externalId: String?
  let optedIn: Bool
  let permission: NotificationPlatformPermission
}

@MainActor protocol NotificationSDK: AnyObject, NotificationPermissionPlatform {
  var installation: NotificationInstallation { get }
  var onChanged: (() -> Void)? { get set }
  var onJwtInvalidated: ((String) -> Void)? { get set }
  func initialize(appId: String)
  func login(accountId: String, token: String)
  func logout()
  func optIn() async throws
  func setForegroundAllowed(_ allowed: Bool)
}

@MainActor protocol NotificationExecuting: AnyObject {
  var onObservation: ((String) -> Void)? { get set }
  func execute(command: String, payload: String) async -> String
}
