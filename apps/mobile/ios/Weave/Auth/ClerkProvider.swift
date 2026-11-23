import Foundation
import ClerkKit
import AuthenticationServices

@MainActor
final class ClerkProvider: AuthProvider {
  var invalidationHandler: (() -> Void)?
  private let health: KeychainHealthCheck
  private let clerk: Clerk
  private var observation: Task<Void, Never>?
  private var attempts: [String: SignIn] = [:]

  init(clerk: Clerk) {
    self.clerk = clerk
    health = KeychainHealthCheck(access: SystemKeychainAccess(service: clerk.options.keychainConfig.service, accessGroup: clerk.options.keychainConfig.accessGroup))
    let events = clerk.auth.events
    observation = Task { @MainActor [weak self] in
      for await event in events {
        guard let self, !Task.isCancelled else { return }
        switch event {
        case .sessionChanged(_, let session):
          if session == nil || session?.status != .active || !(session?.tasks ?? []).isEmpty {
            self.invalidationHandler?()
          }
        case .accountDeleted:
          self.invalidationHandler?()
        case .signedOut(let session):
          if self.clerk.session == nil || self.clerk.session?.id == session.id { self.invalidationHandler?() }
        default: break
        }
      }
    }
  }
  func abandonAttempts() { attempts.removeAll() }
  var storedSessionId: String? { clerk.session?.id }

  func validateSessionFresh() async throws -> ProviderSession? {
    do {
      try health.verify()
      _ = try await clerk.refreshClient()
      guard let session = clerk.session, session.status == .active else { return nil }
      return ProviderSession(sessionId: session.id, accountId: session.user?.id ?? "",
        active: session.status == .active && clerk.isAuthFlowComplete,
        hasPendingTasks: !(session.tasks ?? []).isEmpty)
    } catch { throw Self.safeFailure(error) }
  }

  func password(email: String, password: String) async throws -> ProviderAttempt {
    do {
      try health.verify()
      return try await prepare(try await clerk.auth.signInWithPassword(identifier: email, password: password))
    } catch { throw Self.safeFailure(error) }
  }
  func requestCode(email: String) async throws -> ProviderAttempt {
    do {
      try health.verify()
      return try await prepare(try await clerk.auth.signInWithEmailCode(emailAddress: email))
    } catch { throw Self.safeFailure(error) }
  }
  func verifyCode(attemptId: String, code: String, purpose: String) async throws -> ProviderAttempt {
    guard let attempt = attempts[attemptId] else { throw AuthFailure.invalidInput }
    do {
      try health.verify()
      let result: SignIn
      if purpose == "deviceTrust", attempt.status == .needsClientTrust {
        result = try await attempt.verifyMfaCode(code, type: .emailCode)
      } else if purpose == "signIn", attempt.status == .needsFirstFactor {
        result = try await attempt.verifyCode(code)
      } else { throw AuthFailure.verificationRequired }
      return try await prepare(result)
    } catch { throw Self.safeFailure(error) }
  }
  func resendCode(attemptId: String, purpose: String) async throws -> ProviderAttempt {
    guard let attempt = attempts[attemptId] else { throw AuthFailure.invalidInput }
    do {
      try health.verify()
      let result: SignIn
      if purpose == "deviceTrust", attempt.status == .needsClientTrust {
        result = try await attempt.sendMfaEmailCode()
      } else if purpose == "signIn", attempt.status == .needsFirstFactor {
        result = try await attempt.sendEmailCode()
      } else { throw AuthFailure.verificationRequired }
      return try await prepare(result, prepareDeviceTrust: false)
    } catch { throw Self.safeFailure(error) }
  }
  func google(transferable: Bool) async throws -> ProviderAttempt {
    guard !transferable else { throw AuthFailure.existingAccountRequired }
    do {
      try health.verify()
      let result = try await clerk.auth.signInWithOAuth(provider: .google, transferable: false)
      guard case .signIn(let signIn) = result else { throw AuthFailure.existingAccountRequired }
      return try await prepare(signIn)
    } catch { throw Self.safeFailure(error) }
  }
  func signOut(sessionId: String) async throws {
    guard !sessionId.isEmpty else { throw AuthFailure.invalidInput }
    do {
      try health.verify()
      try await clerk.auth.signOut(sessionId: sessionId)
      try health.verify()
    }
    catch { throw Self.safeFailure(error) }
  }

  private func prepare(_ result: SignIn, prepareDeviceTrust: Bool = true) async throws -> ProviderAttempt {
    var signIn = result
    let stage = Self.classify(signIn)
    if stage == .deviceTrust, prepareDeviceTrust {
      signIn = try await signIn.sendMfaEmailCode()
    }
    attempts[signIn.id] = signIn
    if signIn.status == .complete, let sessionId = signIn.createdSessionId {
      try await clerk.auth.setActive(sessionId: sessionId)
    }
    return ProviderAttempt(id: signIn.id, stage: Self.classify(signIn), createdSessionId: signIn.createdSessionId)
  }

  static func classify(_ signIn: SignIn) -> ProviderAttemptStage {
    if signIn.firstFactorVerification?.status == .transferable || signIn.secondFactorVerification?.status == .transferable {
      return .existingAccountRequired
    }
    switch signIn.status {
    case .complete: return .complete
    case .needsFirstFactor:
      return signIn.firstFactorVerification?.strategy == .emailCode ? .emailCode : .unsupported
    case .needsClientTrust:
      return signIn.supportedSecondFactors?.contains(where: { $0.strategy == .emailCode }) == true ? .deviceTrust : .unsupported
    default: return .unsupported
    }
  }
  static func safeFailure(_ error: Error) -> AuthFailure {
    if let failure = error as? AuthFailure { return failure }
    if error is CancellationError { return .cancelled }
    let nativeError = error as NSError
    if nativeError.domain == "ClerkKit.KeychainError" || nativeError.domain == NSOSStatusErrorDomain { return .storage }
    if nativeError.domain == ASWebAuthenticationSessionError.errorDomain,
       nativeError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue { return .cancelled }
    if let networkError = error as? URLError { return networkError.code == .timedOut ? .timeout : .network }
    if let apiError = error as? ClerkAPIError {
      switch apiError.code {
      case "form_password_incorrect": return .rejectedCredentials
      case "form_identifier_not_found", "sign_up_not_allowed", "external_account_not_found": return .existingAccountRequired
      case "form_code_incorrect": return .codeInvalid
      case "verification_expired", "form_code_expired": return .codeExpired
      case "rate_limit_exceeded", "too_many_requests": return .rateLimited
      case "oauth_access_denied", "oauth_cancelled": return .cancelled
      case "form_identifier_invalid", "form_param_format_invalid", "form_param_nil": return .invalidInput
      default: return .unexpected
      }
    }
    return .unexpected
  }
}
