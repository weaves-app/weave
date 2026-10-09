package si.tryweave.auth

/** Configuration errors remain an observable fail-closed app state, never a startup crash. */
object AuthBootstrap {
  var configured: Boolean = false
    private set

  fun initialize(publishableKey: String, configure: (String) -> Unit): Boolean {
    configured = false
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_"))
      return false
    configured =
      try {
        configure(publishableKey)
        true
      } catch (_: Throwable) {
        false
      }
    return configured
  }
}

object AuthDependencies {
  val service: AuthenticationService by lazy { ClerkAuthService(NativeClerkSdk()) }
}
