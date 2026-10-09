import XCTest
import Security
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class KeychainFixture: KeychainAccess {
  var writeStatus: OSStatus = errSecSuccess
  var readStatus: OSStatus = errSecSuccess
  var deleteStatus: OSStatus = errSecSuccess
  var stored: Data?
  var accounts: [String] = []
  func write(_ data: Data, account: String) -> OSStatus {
    accounts.append(account)
    if writeStatus == errSecSuccess { stored = data }
    return writeStatus
  }
  func read(account: String) -> (OSStatus, Data?) {
    accounts.append(account)
    return stored == nil && readStatus == errSecSuccess ? (errSecItemNotFound, nil) : (readStatus, stored)
  }
  func delete(account: String) -> OSStatus {
    accounts.append(account)
    if deleteStatus == errSecSuccess { stored = nil }
    return deleteStatus
  }
}

final class KeychainHealthTests: XCTestCase {
  func testHealthProbeRoundTripsAndClearsOnlyItsOwnSyntheticItem() throws {
    let fixture = KeychainFixture()
    try KeychainHealthCheck(access: fixture).verify()
    XCTAssertNil(fixture.stored)
    XCTAssertGreaterThanOrEqual(fixture.accounts.count, 4)
    XCTAssertTrue(fixture.accounts.allSatisfy { $0.hasPrefix("weave.auth.health.") })
  }
  func testReadWriteClearFailuresBlockAuthenticationSafely() {
    for operation in ["write", "read", "delete"] {
      let fixture = KeychainFixture()
      if operation == "write" { fixture.writeStatus = errSecInteractionNotAllowed }
      if operation == "read" { fixture.readStatus = errSecMissingEntitlement }
      if operation == "delete" { fixture.deleteStatus = errSecAuthFailed }
      XCTAssertThrowsError(try KeychainHealthCheck(access: fixture).verify()) { error in
        XCTAssertEqual(error as? AuthFailure, .storage)
      }
    }
  }
}
