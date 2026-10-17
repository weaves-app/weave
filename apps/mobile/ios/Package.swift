// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "WeaveNativeContracts",
  platforms: [.macOS(.v14), .iOS(.v17)],
  dependencies: [.package(path: "../vendor/clerk-ios")],
  targets: [
    .target(name: "WeaveAuthContract", dependencies: [.product(name: "ClerkKit", package: "clerk-ios")], path: "Weave", exclude: ["AppDelegate.swift", "Auth/WeaveAuthModule.mm", "Notifications/WeaveNotificationsModule.mm", "Images.xcassets", "Info.plist", "LaunchScreen.storyboard", "PrivacyInfo.xcprivacy", "Weave.entitlements"]),
    .testTarget(name: "WeaveAuthContractTests", dependencies: ["WeaveAuthContract", .product(name: "ClerkKit", package: "clerk-ios")], path: "WeaveTests"),
  ]
)
