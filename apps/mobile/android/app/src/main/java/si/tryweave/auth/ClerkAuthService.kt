package si.tryweave.auth

import java.io.IOException
import java.security.GeneralSecurityException
import java.util.UUID
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Session policy owns epochs and safe results; the SDK seam owns provider resources. */
class ClerkAuthService(private val sdk: AuthSdk) : AuthenticationService {
  private var generation = 0L
  private var epoch = 0L
  private var revision = 0L
  private var validated: ProviderSession? = null
  private var busy = false
  private var validatedAt: Long? = null
  private val obsoleteSessions = mutableSetOf<String>()

  private data class Attempt(val handle: String, val resource: ProviderAttempt, val purpose: String)

  private var attempt: Attempt? = null
  private val listeners = mutableSetOf<(JSONObject) -> Unit>()
  private var stopObservation: (() -> Unit)? = null

  override suspend fun execute(command: String, payload: JSONObject): JSONObject {
    if (command == "dispose") {
      release()
      return snapshot("unavailable")
    }
    if (busy && command != "abandon") return error("cancelled")
    val requestedGeneration = payload.optLong("generation", -1)
    if (requestedGeneration < generation || requestedGeneration < 0) return error("cancelled")
    generation = requestedGeneration
    epoch++
    val operationEpoch = epoch
    if (command == "abandon") {
      attempt = null
      sdk.clearAttempts()
      sdk.cancelPendingSignIn()
      kotlinx.coroutines.yield()
      // Acknowledgement fences access; only fresh resolution/reconciliation reports session
      // outcome.
      return snapshot("unavailable")
    }
    if (!sdk.configured)
      return if (command == "resolveSession") snapshot("unavailable", failure = "configuration")
      else error("configuration")
    busy = true
    return try {
      // A cancelled bridge must still reconcile a provider side effect before releasing it.
      withContext(NonCancellable) {
        when (command) {
          "resolveSession" -> resolve(operationEpoch)
          "password" -> {
            clearAttempt()
            val email = payload.optString("email").trim()
            val password = payload.optString("password")
            if (email.isBlank() || password.isBlank()) error("invalidInput")
            else complete(sdk.password(email, password), operationEpoch, false)
          }
          "requestCode" -> {
            clearAttempt()
            val email = payload.optString("email").trim()
            if (email.isBlank()) error("invalidInput")
            else complete(sdk.requestCode(email), operationEpoch, true)
          }
          "verifyCode",
          "resendCode" -> {
            val current = attempt
            val purpose = payload.optString("codePurpose")
            if (
              current == null ||
                current.handle != payload.optString("attemptId") ||
                current.purpose != purpose
            )
              error("cancelled")
            else if (command == "resendCode") {
              val prepared = sdk.prepareCode(current.resource, purpose)
              if (operationEpoch != epoch) error("cancelled")
              else {
                attempt = current.copy(resource = prepared)
                challenge(attempt!!)
              }
            } else {
              val code = payload.optString("code")
              if (code.isBlank()) error("invalidInput")
              else complete(sdk.verifyCode(current.resource, code, purpose), operationEpoch, false)
            }
          }
          "google" -> {
            clearAttempt()
            complete(sdk.google(transferable = false), operationEpoch, false)
          }
          "signOut" -> signOut(payload.optString("sessionId"), operationEpoch)
          else -> error("unexpected")
        }
      }
    } catch (failure: SafeAuthFailure) {
      if (command == "resolveSession") snapshot("unavailable", failure = failure.code)
      else error(failure.code, failure.retryAfterSeconds)
    } catch (_: GeneralSecurityException) {
      if (command == "resolveSession") snapshot("unavailable", failure = "storage")
      else error("storage")
    } catch (_: IOException) {
      if (command == "resolveSession") snapshot("unavailable", failure = "network")
      else error("network")
    } catch (_: Throwable) {
      if (command == "resolveSession") snapshot("unavailable", failure = "unexpected")
      else error("unexpected")
    } finally {
      busy = false
    }
  }

  private suspend fun resolve(operationEpoch: Long): JSONObject {
    validated = null
    var session = sdk.freshSession()
    if (session?.id in obsoleteSessions) {
      compensate(session!!.id)
      session = sdk.freshSession()
    }
    if (operationEpoch != epoch) return error("cancelled")
    if (session == null || !session.active) return snapshot("signedOut")
    if (session.hasTasks) return snapshot("unavailable", failure = "verificationRequired")
    validated = session
    validatedAt = System.currentTimeMillis()
    return snapshot("active", session)
  }

  private suspend fun complete(
    resource: ProviderAttempt,
    operationEpoch: Long,
    emailCode: Boolean,
  ): JSONObject {
    if (operationEpoch != epoch) {
      resource.sessionId?.let { compensate(it) }
      return error("cancelled")
    }
    if (resource.status == "complete" && resource.sessionId != null) {
      sdk.activate(resource.sessionId)
      if (operationEpoch != epoch) {
        compensate(resource.sessionId)
        return error("cancelled")
      }
      val session = sdk.freshSession()
      if (operationEpoch != epoch) {
        compensate(resource.sessionId)
        return error("cancelled")
      }
      if (session?.id != resource.sessionId || !session.active || session.hasTasks) {
        compensate(resource.sessionId)
        return error("verificationRequired")
      }
      clearAttempt()
      validated = session
      validatedAt = System.currentTimeMillis()
      return snapshot("active", session)
    }
    val purpose =
      when {
        resource.status == "needs_client_trust" && resource.emailFactorId != null -> "deviceTrust"
        emailCode && resource.status == "needs_first_factor" && resource.emailFactorId != null ->
          "signIn"
        else -> {
          clearAttempt()
          return error("verificationRequired")
        }
      }
    val prepared = sdk.prepareCode(resource, purpose)
    if (operationEpoch != epoch) return error("cancelled")
    val pending = Attempt(UUID.randomUUID().toString(), prepared, purpose)
    attempt = pending
    return challenge(pending)
  }

  private suspend fun compensate(sessionId: String) {
    obsoleteSessions.add(sessionId)
    sdk.endSession(sessionId)
    obsoleteSessions.remove(sessionId)
  }

  private fun failureCode(failure: Throwable): String =
    when (failure) {
      is SafeAuthFailure -> failure.code
      is GeneralSecurityException -> "storage"
      is IOException -> "network"
      else -> "unexpected"
    }

  private suspend fun signOut(sessionId: String, operationEpoch: Long): JSONObject {
    clearAttempt()
    val current = sdk.currentSession()
    if (current == null) {
      validated = null
      return snapshot("signedOut")
    }
    if (sessionId.isBlank() || current.id != sessionId) return resolve(operationEpoch)
    var failure: String? = null
    try {
      sdk.endSession(sessionId)
    } catch (caught: Throwable) {
      failure = failureCode(caught)
    }
    val remaining =
      try {
        sdk.freshSession()
      } catch (caught: Throwable) {
        validated = null
        return snapshot("unavailable", failure = failureCode(caught))
      }
    if (operationEpoch != epoch) return error("cancelled")
    if (remaining == null || !remaining.active) {
      validated = null
      return snapshot("signedOut", failure = failure)
    }
    if (remaining.hasTasks || remaining.id in obsoleteSessions) {
      validated = null
      return snapshot("unavailable", failure = failure ?: "verificationRequired")
    }
    validated = remaining
    validatedAt = System.currentTimeMillis()
    return snapshot("active", remaining, failure ?: "unexpected")
  }

  private fun clearAttempt() {
    attempt = null
    sdk.clearAttempts()
  }

  private fun challenge(value: Attempt): JSONObject =
    JSONObject()
      .put("kind", "challenge")
      .put("attemptId", value.handle)
      .put("codePurpose", value.purpose)

  private fun error(code: String, retryAfterSeconds: Int? = null): JSONObject =
    JSONObject().put("kind", "error").put("code", code).apply {
      retryAfterSeconds?.takeIf { it >= 0 }?.let { put("retryAfterSeconds", it) }
    }

  private fun snapshot(
    status: String,
    session: ProviderSession? = null,
    failure: String? = null,
  ): JSONObject {
    revision++
    return JSONObject()
      .put("status", status)
      .put("generation", generation)
      .put("revision", revision)
      .apply {
        if (status == "active" && session != null) {
          put("sessionId", session.id)
          put("accountId", session.accountId)
          put("validatedAt", validatedAt)
        }
        failure?.let { put("error", JSONObject().put("code", it)) }
      }
  }

  override fun observe(listener: (JSONObject) -> Unit): () -> Unit {
    listeners.add(listener)
    if (stopObservation == null)
      stopObservation = sdk.observeInvalidation {
        if (!busy) {
          val session =
            try {
              sdk.currentSession()
            } catch (caught: Throwable) {
              epoch++
              validated = null
              emit(snapshot("unavailable", failure = failureCode(caught)))
              return@observeInvalidation
            }
          if (session == null || !session.active) {
            epoch++
            clearAttempt()
            validated = null
            val update = snapshot("signedOut")
            emit(update)
          } else if (session.id != validated?.id || session.hasTasks) {
            epoch++
            validated = null
            val update =
              snapshot(
                "unavailable",
                failure = if (session.hasTasks) "verificationRequired" else null,
              )
            emit(update)
          }
        }
      }
    return {
      listeners.remove(listener)
      if (listeners.isEmpty()) {
        stopObservation?.invoke()
        stopObservation = null
      }
    }
  }

  private fun emit(value: JSONObject) {
    listeners.toList().forEach { listener ->
      try {
        listener(value)
      } catch (_: Throwable) {
        /* Released consumers cannot escape to SDK logs. */
      }
    }
  }

  override fun release() {
    epoch++
    clearAttempt()
    sdk.cancelPendingSignIn()
    validated = null
  }
}
