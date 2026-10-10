// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "WeaveNativeContracts",
  platforms: [.macOS(.v14), .iOS(.v17)],
  dependencies: [.package(path: "../vendor/clerk-ios")],
  targets: [
    .target(name: "WeaveAuthContract", dependencies: [.product(name: "ClerkKit", package: "clerk-ios")], path: "Weave/Auth", exclude: ["WeaveAuthModule.mm"]),
    .testTarget(name: "WeaveAuthContractTests", dependencies: ["WeaveAuthContract", .product(name: "ClerkKit", package: "clerk-ios")], path: "WeaveTests"),
  ]
)
