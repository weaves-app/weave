import XCTest
import ClerkKit
import AuthenticationServices
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class ClerkProviderTests: XCTestCase {
  @MainActor
  func testActualSDKStatusesAllowOnlyCompleteAndSupportedEmailChallenges() {
    XCTAssertEqual(ClerkProvider.classify(SignIn(id: "id", status: .complete, createdSessionId: "sess_1")), .complete)
    XCTAssertEqual(ClerkProvider.classify(SignIn(id: "id", status: .needsFirstFactor,
      supportedFirstFactors: [Factor(strategy: .emailCode)], firstFactorVerification: Verification(strategy: .emailCode))), .emailCode)
    XCTAssertEqual(ClerkProvider.classify(SignIn(id: "id", status: .needsClientTrust,
      supportedSecondFactors: [Factor(strategy: .emailCode)])), .deviceTrust)
    for status in [SignIn.Status.needsSecondFactor, .needsNewPassword, .needsIdentifier, .unknown("new_status")] {
      XCTAssertEqual(ClerkProvider.classify(SignIn(id: "id", status: status)), .unsupported)
    }
    XCTAssertEqual(ClerkProvider.classify(SignIn(id: "id", status: .needsClientTrust,
      supportedSecondFactors: [Factor(strategy: .totp)])), .unsupported)
  }

  @MainActor
  func testTransferableUnknownOAuthIdentityStaysExistingAccountsOnly() {
    let attempt = SignIn(id: "id", status: .needsFirstFactor, firstFactorVerification: Verification(status: .transferable, strategy: .oauth(.google)))
    XCTAssertEqual(ClerkProvider.classify(attempt), .existingAccountRequired)
    XCTAssertEqual(ClerkProvider.safeFailure(NSError(domain: ASWebAuthenticationSessionError.errorDomain, code: ASWebAuthenticationSessionError.canceledLogin.rawValue)), .cancelled)
  }

  @MainActor
  func testActualSDKErrorCodesDiscardRawProviderDescriptions() throws {
    let mappings: [(String, AuthFailure)] = [
      ("form_password_incorrect", .rejectedCredentials), ("form_identifier_not_found", .existingAccountRequired),
      ("form_code_incorrect", .codeInvalid), ("verification_expired", .codeExpired), ("rate_limit_exceeded", .rateLimited),
    ]
    for (code, expected) in mappings {
      let data = try JSONSerialization.data(withJSONObject: ["code": code, "message": "seeded-secret", "long_message": "seeded-secret"])
      let error = try JSONDecoder().decode(ClerkAPIError.self, from: data)
      XCTAssertEqual(ClerkProvider.safeFailure(error), expected)
    }
    XCTAssertEqual(ClerkProvider.safeFailure(URLError(.notConnectedToInternet)), .network)
    XCTAssertEqual(ClerkProvider.safeFailure(URLError(.timedOut)), .timeout)
    XCTAssertEqual(ClerkProvider.safeFailure(CancellationError()), .cancelled)
    XCTAssertEqual(ClerkProvider.safeFailure(NSError(domain: "seeded-secret", code: 7)), .unexpected)
    XCTAssertEqual(ClerkProvider.safeFailure(NSError(domain: "ClerkKit.KeychainError", code: 7, userInfo: [NSLocalizedDescriptionKey: "seeded-secret"])), .storage)
  }
}
