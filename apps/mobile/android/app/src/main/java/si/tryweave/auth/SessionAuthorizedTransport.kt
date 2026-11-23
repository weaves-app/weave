package si.tryweave.auth

/** Credentials stay inside the auth adapter and never cross the JS bridge. */
data class NotificationSessionContext(val sessionId: String, val accountId: String, val generation: Long)

enum class NotificationHttpOperation { IDENTITY_GRANT, READINESS }

data class NotificationHttpRequest(
  val operation: NotificationHttpOperation,
  val subscriptionId: String? = null,
  val platform: String? = null,
)

sealed interface NotificationHttpResult {
  data class Response(val status: Int, val body: String) : NotificationHttpResult
  data object Unavailable : NotificationHttpResult
  data object Stale : NotificationHttpResult
}

interface SessionAuthorizedTransport {
  suspend fun execute(context: NotificationSessionContext, request: NotificationHttpRequest): NotificationHttpResult
}
