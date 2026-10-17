import Foundation

struct NotificationSessionContext: Equatable, Sendable {
  let sessionId: String
  let accountId: String
  let generation: Int
}

enum NotificationHttpOperation: Sendable {
  case identityGrant
  case readiness(subscriptionId: String, platform: String)
}

enum NotificationHttpResult: Sendable {
  case response(status: Int, body: Data)
  case unavailable
  case stale
}

/// Native-only boundary. The implementation owns credentials, origin and allowed paths.
@MainActor protocol SessionAuthorizedTransport {
  func execute(context: NotificationSessionContext, operation: NotificationHttpOperation) async -> NotificationHttpResult
}
