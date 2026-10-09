import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class AuthConfigurationTests: XCTestCase {
  private var valid: [String: Any] {
    ["WeaveClerkPublishableKey": "pk_test_" + Data("clerk.fixture.test$".utf8).base64EncodedString(),
     "WeaveAuthCallbackScheme": "si.tryweave.fixture", "WeaveAuthCallbackURL": "si.tryweave.fixture://callback"]
  }
  func testValidatedNativeConfigurationUsesExplicitOwnerIdentity() {
    let configuration = WeaveAuthConfiguration.read(valid)
    XCTAssertNotNil(configuration)
    XCTAssertEqual(configuration?.callbackScheme, "si.tryweave.fixture")
    XCTAssertEqual(configuration?.callbackURL, "si.tryweave.fixture://callback")
  }
  func testMissingInvalidOrMismatchedConfigurationFailsClosed() {
    XCTAssertNil(WeaveAuthConfiguration.read([:]))
    for (key, value) in [("WeaveClerkPublishableKey", "sk_test_seeded-secret"),
      ("WeaveClerkPublishableKey", "pk_test_invalid"), ("WeaveAuthCallbackScheme", ""),
      ("WeaveAuthCallbackURL", "unrelated://callback"), ("WeaveAuthCallbackURL", "https://example.test/callback")] {
      var info = valid
      info[key] = value
      XCTAssertNil(WeaveAuthConfiguration.read(info))
    }
  }
}
