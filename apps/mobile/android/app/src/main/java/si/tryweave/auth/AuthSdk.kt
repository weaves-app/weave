package si.tryweave.auth

/** SDK resource facts only; no user objects, credentials or raw provider errors. */
data class ProviderSession(
  val id: String,
  val accountId: String,
  val active: Boolean = true,
  val hasTasks: Boolean = false,
)

data class ProviderAttempt(
  val id: String,
  val status: String,
  val sessionId: String? = null,
  val emailFactorId: String? = null,
)

class SafeAuthFailure(val code: String, val retryAfterSeconds: Int? = null) : Exception()

interface AuthSdk {
  val configured: Boolean

  suspend fun freshSession(): ProviderSession?

  fun currentSession(): ProviderSession?

  suspend fun password(email: String, password: String): ProviderAttempt

  suspend fun requestCode(email: String): ProviderAttempt

  suspend fun prepareCode(attempt: ProviderAttempt, purpose: String): ProviderAttempt

  suspend fun verifyCode(attempt: ProviderAttempt, code: String, purpose: String): ProviderAttempt

  suspend fun google(transferable: Boolean): ProviderAttempt

  suspend fun activate(sessionId: String)

  suspend fun endSession(sessionId: String)

  fun observeInvalidation(listener: () -> Unit): () -> Unit

  fun cancelPendingSignIn() {}

  fun clearAttempts()
}
