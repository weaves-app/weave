import XCTest
#if SWIFT_PACKAGE
@testable import WeaveAuthContract
#endif

final class NotificationPermissionTests: XCTestCase {
  @MainActor
  func testS01ObservationAndActivationRefreshNeverPromptOrOptIn() async {
    let platform = NotificationPermissionFixture()
    let adapter = NotificationPermissionAdapter(platform: platform)
    for _ in 0..<4 {
      let observation = await adapter.observe()
      XCTAssertEqual(observation.permission, .undetermined)
      XCTAssertTrue(observation.canRequest)
    }
    XCTAssertEqual(platform.requests, 0)
    XCTAssertEqual(platform.optIns, 0)
    XCTAssertEqual(platform.settingsOpens, 0)
  }

  @MainActor
  func testS01ExplicitEnableRequestsOnceAndReadsActualPermission() async {
    let platform = NotificationPermissionFixture()
    platform.afterRequest = .init(status: .authorized, canRequest: false)
    let observation = await NotificationPermissionAdapter(platform: platform).enable()
    XCTAssertEqual(observation.permission, .allowed)
    XCTAssertFalse(observation.canRequest)
    XCTAssertEqual(platform.requests, 1)
    XCTAssertEqual(platform.optIns, 0)
    XCTAssertEqual(platform.settingsOpens, 0)
  }

  @MainActor
  func testS01OverlappingEnableActionsShareOnePermissionRequest() async {
    let platform = NotificationPermissionFixture()
    platform.pauseRequest = true
    platform.afterRequest = .init(status: .authorized, canRequest: false)
    let adapter = NotificationPermissionAdapter(platform: platform)
    let first = Task { await adapter.enable() }
    for _ in 0..<100 where platform.requests == 0 { await Task.yield() }
    let second = Task { await adapter.enable() }
    for _ in 0..<20 { await Task.yield() }
    XCTAssertEqual(platform.requests, 1)
    platform.finishRequest()
    let firstResult = await first.value
    let secondResult = await second.value
    XCTAssertEqual(firstResult, secondResult)
    XCTAssertEqual(firstResult.permission, .allowed)
    XCTAssertEqual(platform.requests, 1)
    XCTAssertEqual(platform.optIns, 0)
  }

  @MainActor
  func testS02DenialAndDismissalRemainSafeWithoutOptInOrAutomaticSettings() async {
    for status in [NotificationAuthorizationStatus.denied, .notDetermined] {
      let platform = NotificationPermissionFixture()
      platform.afterRequest = .init(status: status, canRequest: status == .notDetermined)
      let result = await NotificationPermissionAdapter(platform: platform).enable()
      XCTAssertEqual(result.permission, status == .denied ? .denied : .undetermined)
      XCTAssertEqual(platform.requests, 1)
      XCTAssertEqual(platform.optIns, 0)
      XCTAssertEqual(platform.settingsOpens, 0)
    }
  }

  @MainActor
  func testS02NonRequestableAndRestrictedStatesNeverRequest() async {
    for status in [NotificationAuthorizationStatus.denied, .restricted, .unavailable] {
      let platform = NotificationPermissionFixture()
      platform.current = .init(status: status, canRequest: false)
      let adapter = NotificationPermissionAdapter(platform: platform)
      let result = await adapter.enable()
      XCTAssertEqual(result.permission.rawValue, status.rawValue)
      XCTAssertFalse(result.canRequest)
      XCTAssertEqual(platform.requests, 0)
      XCTAssertEqual(platform.optIns, 0)
      XCTAssertEqual(platform.settingsOpens, 0)
    }
  }

  @MainActor
  func testS02ProvisionalAndEphemeralPermissionRequireExplicitUpgrade() async {
    for status in [NotificationAuthorizationStatus.provisional, .ephemeral] {
      let platform = NotificationPermissionFixture()
      platform.current = .init(status: status, canRequest: true)
      platform.afterRequest = .init(status: .authorized, canRequest: false)
      let adapter = NotificationPermissionAdapter(platform: platform)
      let initial = await adapter.observe()
      XCTAssertEqual(initial.permission, .undetermined)
      XCTAssertTrue(initial.canRequest)
      XCTAssertEqual(platform.requests, 0)
      let upgraded = await adapter.enable()
      XCTAssertEqual(upgraded.permission, .allowed)
      XCTAssertEqual(platform.requests, 1)
    }
  }

  @MainActor
  func testS02AlreadyAllowedPermissionIsReusedWithoutPrompt() async {
    let platform = NotificationPermissionFixture()
    platform.current = .init(status: .authorized, canRequest: false)
    let observation = await NotificationPermissionAdapter(platform: platform).enable()
    XCTAssertEqual(observation.permission, .allowed)
    XCTAssertEqual(platform.requests, 0)
    XCTAssertEqual(platform.optIns, 0)
  }

  @MainActor
  func testS02OnlyExplicitSettingsActionOpensSettingsAndReturnReflectsChange() async {
    let platform = NotificationPermissionFixture()
    platform.current = .init(status: .denied, canRequest: false)
    let adapter = NotificationPermissionAdapter(platform: platform)
    let initial = await adapter.observe()
    XCTAssertEqual(initial.permission, .denied)
    XCTAssertEqual(platform.settingsOpens, 0)
    await adapter.openSettings()
    XCTAssertEqual(platform.settingsOpens, 1)
    platform.current = .init(status: .authorized, canRequest: false)
    let returned = await adapter.observe()
    XCTAssertEqual(returned.permission, .allowed)
    XCTAssertEqual(platform.requests, 0)
    XCTAssertEqual(platform.optIns, 0)
  }

  @MainActor
  func testS02PlatformFaultsBecomeUnavailableAndLaterExplicitRetryCanRecover() async {
    let platform = NotificationPermissionFixture()
    platform.failReads = true
    let adapter = NotificationPermissionAdapter(platform: platform)
    let initial = await adapter.observe()
    XCTAssertEqual(initial.permission, .unavailable)
    XCTAssertFalse(initial.canRequest)
    let failed = await adapter.enable()
    XCTAssertEqual(failed.permission, .unavailable)
    platform.failReads = false
    platform.afterRequest = .init(status: .authorized, canRequest: false)
    let retried = await adapter.enable()
    XCTAssertEqual(retried.permission, .allowed)
    XCTAssertEqual(platform.requests, 1)
  }
}

@MainActor
private final class NotificationPermissionFixture: NotificationPermissionPlatform {
  var current = NotificationPlatformPermission(status: .notDetermined, canRequest: true)
  var afterRequest = NotificationPlatformPermission(status: .denied, canRequest: false)
  var requests = 0
  var optIns = 0
  var settingsOpens = 0
  var failReads = false
  var pauseRequest = false
  private let requestGate = NotificationDeferred<Bool>()

  func permission() async throws -> NotificationPlatformPermission {
    if failReads { throw PermissionFixtureError.unavailable }
    return current
  }

  func requestPermission() async throws {
    requests += 1
    if pauseRequest {
      _ = await requestGate.value()
    }
    current = afterRequest
  }

  func optIn() async throws { optIns += 1 }
  func openSettings() async throws { settingsOpens += 1 }
  func finishRequest() { requestGate.resolve(true) }
}

private enum PermissionFixtureError: Error { case unavailable }
