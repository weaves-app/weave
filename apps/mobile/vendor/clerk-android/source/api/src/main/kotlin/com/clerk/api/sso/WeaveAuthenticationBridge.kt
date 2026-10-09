package com.clerk.api.sso

/** Weave-owned capability seam; no configuration, session or credential storage reset. */
object WeaveAuthenticationBridge {
  fun cancelPendingSignIn() {
    SSOService.cancelPendingAuthentication()
  }
}
