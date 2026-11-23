import Foundation
import CoreFoundation

struct NotificationRequest {
  let command: String
  let lease: String
  let generation: Int
  let context: NotificationSessionContext?
  let revision: Int?
  let attemptId: String?
}

enum NotificationWire {
  static func integer(_ value: Any?) -> Int? {
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
          number.doubleValue.isFinite, number.doubleValue >= 0,
          number.doubleValue <= 9007199254740991,
          number.doubleValue.rounded(.down) == number.doubleValue else { return nil }
    return number.intValue
  }
  static func string(_ value: Any?, limit: Int = 4096) -> String? {
    guard let value = value as? String, !value.isEmpty, value.count <= limit else { return nil }
    return value
  }
  static func decode(_ command: String, _ payload: String) -> NotificationRequest? {
    let data = Data(payload.utf8)
    guard data.count <= 4096, let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          integer(body["version"]) == 1, let lease = string(body["rootLease"], limit: 128),
          let generation = integer(body["generation"]),
          ["acquire", "release", "reconcile", "enable", "refresh", "openSettings"].contains(command) else { return nil }
    var allowed: Set<String> = ["version", "rootLease", "generation"]
    if !["acquire", "release"].contains(command) { allowed.formUnion(["sessionId", "accountId"]) }
    if command == "refresh" { allowed.formUnion(["revision", "attemptId"]) }
    guard Set(body.keys).isSubset(of: allowed) else { return nil }
    let session = string(body["sessionId"]), account = string(body["accountId"])
    guard (session != nil) == (account != nil),
          (body["sessionId"] == nil) == (session == nil), (body["accountId"] == nil) == (account == nil),
          !["enable", "refresh", "openSettings"].contains(command) || session != nil,
          !["acquire", "release"].contains(command) || generation == 0 else { return nil }
    let revision = integer(body["revision"]), attempt = string(body["attemptId"], limit: 128)
    guard command != "refresh" || (revision != nil && attempt.flatMap(sequence) != nil) else { return nil }
    return .init(command: command, lease: lease, generation: generation,
      context: session.flatMap { session in account.map { .init(sessionId: session, accountId: $0, generation: generation) } }, revision: revision, attemptId: attempt)
  }
  static func sequence(_ value: String) -> Int? {
    guard let number = Int(value), number > 0, number <= 9007199254740991, String(number) == value else { return nil }
    return number
  }
  static func encode(_ body: [String: Any]) -> String {
    guard let data = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys]) else { return "{}" }
    return String(decoding: data, as: UTF8.self)
  }
  static func error(_ code: String, lease: String = "invalid", generation: Int = 0) -> String {
    encode(["version": 1, "kind": "error", "rootLease": lease, "generation": generation, "code": code])
  }
  static func date(_ value: Any?) -> Date? {
    guard let value = value as? String else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: value) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: value)
  }
}
