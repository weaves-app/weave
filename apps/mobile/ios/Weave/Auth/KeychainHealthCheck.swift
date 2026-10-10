import Foundation
import Security

protocol KeychainAccess {
  func write(_ data: Data, account: String) -> OSStatus
  func read(account: String) -> (OSStatus, Data?)
  func delete(account: String) -> OSStatus
}

struct KeychainHealthCheck {
  let access: any KeychainAccess
  func verify() throws {
    let account = "weave.auth.health." + UUID().uuidString
    let marker = Data(UUID().uuidString.utf8)
    guard access.write(marker, account: account) == errSecSuccess else { throw AuthFailure.storage }
    defer { _ = access.delete(account: account) }
    let (readStatus, stored) = access.read(account: account)
    guard readStatus == errSecSuccess, stored == marker else { throw AuthFailure.storage }
    guard access.delete(account: account) == errSecSuccess else { throw AuthFailure.storage }
    let (clearedStatus, _) = access.read(account: account)
    guard clearedStatus == errSecItemNotFound else { throw AuthFailure.storage }
  }
}


struct SystemKeychainAccess: KeychainAccess {
  let service: String
  let accessGroup: String?
  private func query(account: String) -> [String: Any] {
    var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: account]
    if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
    #if os(macOS)
    if accessGroup != nil { query[kSecUseDataProtectionKeychain as String] = true }
    #endif
    return query
  }
  func write(_ data: Data, account: String) -> OSStatus {
    var query = query(account: account)
    query[kSecValueData as String] = data
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    return SecItemAdd(query as CFDictionary, nil)
  }
  func read(account: String) -> (OSStatus, Data?) {
    var query = query(account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var value: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &value)
    return (status, value as? Data)
  }
  func delete(account: String) -> OSStatus { SecItemDelete(query(account: account) as CFDictionary) }
}
