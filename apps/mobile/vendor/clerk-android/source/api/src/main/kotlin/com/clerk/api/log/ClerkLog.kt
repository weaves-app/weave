package com.clerk.api.log

/** Weave privacy patch: provider-owned messages never reach diagnostic sinks. */
@Suppress("UNUSED_PARAMETER")
object ClerkLog {
  fun e(message: String): Int = 0

  fun w(message: String): Int = 0

  fun i(message: String): Int = 0

  fun d(message: String): Int = 0

  fun v(message: String): Int = 0
}
