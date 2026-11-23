package si.tryweave.auth

import com.clerk.api.Clerk
import com.clerk.api.network.model.error.ClerkErrorResponse
import com.clerk.api.network.serialization.ClerkResult
import com.clerk.api.session.Session
import com.clerk.api.signin.SignIn
import com.clerk.api.signin.attemptFirstFactor
import com.clerk.api.signin.attemptSecondFactor
import com.clerk.api.signin.sendEmailCode
import com.clerk.api.signin.sendMfaEmailCode
import com.clerk.api.sso.OAuthProvider
import com.clerk.api.sso.SSOCancellationException
import java.io.IOException
import java.security.GeneralSecurityException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull

/** Exact SDK APIs are contained here; no signup API is invoked by this application. */
class NativeClerkSdk : AuthSdk {
  private val attempts = mutableMapOf<String, SignIn>()
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  override val configured: Boolean
    get() = AuthBootstrap.configured

  private suspend fun ready() {
    if (!configured) throw SafeAuthFailure("configuration")
    try {
      val state =
        withTimeout(30_000) {
          combine(Clerk.isInitialized, Clerk.initializationError) { initialized, failure ->
              initialized to failure
            }
            .first { it.first || it.second != null }
        }
      state.second?.let {
        throw SafeAuthFailure(
          when (it) {
            is GeneralSecurityException -> "storage"
            is IOException -> "network"
            else -> "configuration"
          }
        )
      }
    } catch (_: TimeoutCancellationException) {
      throw SafeAuthFailure("timeout")
    }
  }

  override suspend fun freshSession(): ProviderSession? {
    ready()
    unwrap(Clerk.refreshClient())
    return currentSession()
  }

  override fun currentSession(): ProviderSession? =
    Clerk.session?.let { session ->
      val id = session.user?.id ?: session.publicUserData?.userId
      if (id == null && session.status == Session.SessionStatus.ACTIVE)
        throw SafeAuthFailure("unexpected")
      ProviderSession(
        session.id,
        id.orEmpty(),
        session.status == Session.SessionStatus.ACTIVE,
        session.currentTask != null || session.tasks.isNotEmpty(),
      )
    }

  override suspend fun password(email: String, password: String): ProviderAttempt {
    ready()
    return remember(unwrap(SignIn.create(SignIn.CreateParams.Strategy.Password(email, password))))
  }

  override suspend fun requestCode(email: String): ProviderAttempt {
    ready()
    return remember(
      unwrap(SignIn.create(SignIn.CreateParams.Strategy.Identifier(identifier = email)))
    )
  }

  override suspend fun prepareCode(attempt: ProviderAttempt, purpose: String): ProviderAttempt {
    val resource = attempts[attempt.id] ?: throw SafeAuthFailure("cancelled")
    val response =
      if (purpose == "deviceTrust") {
        if (resource.status != SignIn.Status.NEEDS_CLIENT_TRUST)
          throw SafeAuthFailure("verificationRequired")
        resource.sendMfaEmailCode(attempt.emailFactorId)
      } else {
        if (resource.status != SignIn.Status.NEEDS_FIRST_FACTOR)
          throw SafeAuthFailure("verificationRequired")
        resource.sendEmailCode(attempt.emailFactorId)
      }
    return remember(unwrap(response))
  }

  override suspend fun verifyCode(
    attempt: ProviderAttempt,
    code: String,
    purpose: String,
  ): ProviderAttempt {
    val resource = attempts[attempt.id] ?: throw SafeAuthFailure("cancelled")
    val response =
      if (purpose == "deviceTrust") {
        if (resource.status != SignIn.Status.NEEDS_CLIENT_TRUST)
          throw SafeAuthFailure("verificationRequired")
        resource.attemptSecondFactor(SignIn.AttemptSecondFactorParams.EmailCode(code))
      } else {
        if (resource.status != SignIn.Status.NEEDS_FIRST_FACTOR)
          throw SafeAuthFailure("verificationRequired")
        resource.attemptFirstFactor(SignIn.AttemptFirstFactorParams.EmailCode(code))
      }
    return remember(unwrap(response))
  }

  override suspend fun google(transferable: Boolean): ProviderAttempt {
    ready()
    val result =
      unwrap(
        SignIn.authenticateWithRedirect(
          SignIn.AuthenticateWithRedirectParams.OAuth(provider = OAuthProvider.GOOGLE),
          transferable = transferable,
        )
      )
    if (result.signUp != null || result.signIn == null)
      throw SafeAuthFailure("existingAccountRequired")
    return remember(result.signIn!!)
  }

  override suspend fun activate(sessionId: String) {
    unwrap(Clerk.auth.setActive(sessionId = sessionId))
  }

  override suspend fun endSession(sessionId: String) {
    unwrap(Clerk.auth.signOut(sessionId = sessionId))
  }

  override fun observeInvalidation(listener: () -> Unit): () -> Unit {
    val job = scope.launch { Clerk.sessionFlow.drop(1).collect { listener() } }
    return { job.cancel() }
  }

  override fun cancelPendingSignIn() {
    com.clerk.api.sso.WeaveAuthenticationBridge.cancelPendingSignIn()
  }

  override fun clearAttempts() {
    attempts.clear()
  }

  private fun remember(resource: SignIn): ProviderAttempt {
    attempts[resource.id] = resource
    val factors =
      if (resource.status == SignIn.Status.NEEDS_CLIENT_TRUST) resource.supportedSecondFactors
      else resource.supportedFirstFactors
    return ProviderAttempt(
      resource.id,
      when (resource.status) {
        SignIn.Status.COMPLETE -> "complete"
        SignIn.Status.NEEDS_FIRST_FACTOR -> "needs_first_factor"
        SignIn.Status.NEEDS_CLIENT_TRUST -> "needs_client_trust"
        SignIn.Status.NEEDS_SECOND_FACTOR -> "needs_second_factor"
        SignIn.Status.NEEDS_NEW_PASSWORD -> "needs_new_password"
        else -> "unknown"
      },
      resource.createdSessionId,
      factors?.firstOrNull { it.strategy == "email_code" }?.emailAddressId,
    )
  }

  private fun <T : Any> unwrap(result: ClerkResult<T, ClerkErrorResponse>): T =
    when (result) {
      is ClerkResult.Success -> result.value
      is ClerkResult.Failure -> {
        throw mapFailure(result)
      }
    }

  companion object {
    internal fun mapFailure(result: ClerkResult.Failure<ClerkErrorResponse>): SafeAuthFailure {
      val codes = result.error?.errors?.mapNotNull { it.code }.orEmpty()
      val code =
        when {
          result.throwable is SSOCancellationException -> "cancelled"
          result.throwable is GeneralSecurityException -> "storage"
          result.throwable is IOException -> "network"
          result.code == 429 ||
            codes.any {
              it in
                setOf(
                  "too_many_requests",
                  "rate_limit_exceeded",
                  "form_identifier_rate_limit_exceeded",
                  "verification_max_attempts",
                )
            } -> "rateLimited"
          codes.any {
            it in
              setOf(
                "form_identifier_not_found",
                "identifier_not_found",
                "external_account_not_found",
                "sign_up_not_allowed",
              )
          } -> "existingAccountRequired"
          codes.any {
            it in setOf("form_password_incorrect", "form_password_or_identifier_incorrect")
          } -> "rejectedCredentials"
          codes.any { it in setOf("verification_expired", "verification_code_expired") } ->
            "codeExpired"
          codes.any {
            it in setOf("form_code_incorrect", "verification_failed", "verification_code_invalid")
          } -> "codeInvalid"
          codes.any {
            it in setOf("form_param_nil", "form_param_format_invalid", "form_identifier_invalid")
          } -> "invalidInput"
          codes.any {
            it in
              setOf(
                "strategy_for_user_invalid",
                "sign_in_status_invalid",
                "first_factor_strategy_not_supported",
              )
          } -> "verificationRequired"
          result.code != null && result.code!! >= 500 -> "network"
          else -> "unexpected"
        }
      val response = result.tags[okhttp3.Response::class] as? okhttp3.Response
      val hint =
        response?.header("Retry-After")?.toIntOrNull()
          ?: (result.error?.meta?.get("retry_after") as? JsonPrimitive)?.intOrNull
          ?: result.error?.errors?.firstNotNullOfOrNull {
            (it.meta?.get("retry_after") as? JsonPrimitive)?.intOrNull
          }
      return SafeAuthFailure(code, hint?.takeIf { it >= 0 })
    }
  }
}
