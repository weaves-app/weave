import Foundation

enum NotificationAuthorizationStatus: String, Sendable {
  case notDetermined, authorized, denied, provisional, ephemeral, restricted, unavailable
}

enum NotificationPermission: String, Sendable {
  case undetermined, allowed, denied, restricted, unavailable
}

struct NotificationPlatformPermission: Equatable, Sendable {
  let status: NotificationAuthorizationStatus
  let canRequest: Bool
}

struct NotificationPermissionObservation: Equatable, Sendable {
  let permission: NotificationPermission
  let canRequest: Bool
}

@MainActor
protocol NotificationPermissionPlatform {
  func permission() async throws -> NotificationPlatformPermission
  func requestPermission() async throws
  func openSettings() async throws
}

@MainActor
final class NotificationPermissionAdapter {
  private let platform: any NotificationPermissionPlatform
  private var pendingEnable: Task<NotificationPermissionObservation, Never>?

  init(platform: any NotificationPermissionPlatform) { self.platform = platform }

  func observe() async -> NotificationPermissionObservation {
    do { return Self.normalize(try await platform.permission()) }
    catch { return .init(permission: .unavailable, canRequest: false) }
  }

  /// Requests permission only. The coordinator separately guards any opt-in effect.
  func enable() async -> NotificationPermissionObservation {
    if let pendingEnable { return await pendingEnable.value }
    let operation = Task { await performEnable() }
    pendingEnable = operation
    defer { pendingEnable = nil }
    return await operation.value
  }

  func openSettings() async {
    try? await platform.openSettings()
  }

  private func performEnable() async -> NotificationPermissionObservation {
    var observation = await observe()
    do {
      if observation.canRequest {
        try await platform.requestPermission()
        observation = await observe()
      }
      return observation
    } catch {
      return .init(permission: .unavailable, canRequest: false)
    }
  }

  static func normalize(_ platform: NotificationPlatformPermission) -> NotificationPermissionObservation {
    switch platform.status {
    case .authorized: return .init(permission: .allowed, canRequest: false)
    case .notDetermined, .provisional, .ephemeral:
      return .init(permission: .undetermined, canRequest: platform.canRequest)
    case .denied: return .init(permission: .denied, canRequest: false)
    case .restricted: return .init(permission: .restricted, canRequest: false)
    case .unavailable: return .init(permission: .unavailable, canRequest: false)
    }
  }
}
