import Foundation

enum AuthFailure: String, Error {
  case invalidInput, rejectedCredentials, codeInvalid, codeExpired, rateLimited
  case existingAccountRequired, cancelled, network, timeout, configuration
  case verificationRequired, storage, unexpected
}

struct ProviderSession {
  let sessionId: String
  let accountId: String
  let active: Bool
  let hasPendingTasks: Bool
}

enum ProviderAttemptStage: Equatable {
  case complete, emailCode, deviceTrust, unsupported, existingAccountRequired
}

struct ProviderAttempt {
  let id: String
  let stage: ProviderAttemptStage
  let createdSessionId: String?
}

@MainActor
protocol AuthProvider: AnyObject {
  func abandonAttempts()
  func validateSessionFresh() async throws -> ProviderSession?
  func password(email: String, password: String) async throws -> ProviderAttempt
  func requestCode(email: String) async throws -> ProviderAttempt
  func verifyCode(attemptId: String, code: String, purpose: String) async throws -> ProviderAttempt
  func resendCode(attemptId: String, purpose: String) async throws -> ProviderAttempt
  func google(transferable: Bool) async throws -> ProviderAttempt
  func signOut(sessionId: String) async throws
  var invalidationHandler: (() -> Void)? { get set }
  var storedSessionId: String? { get }
}
