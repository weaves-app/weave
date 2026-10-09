package si.tryweave.auth

import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class WeaveAuthModuleTest {
  @Test
  fun `T008 native shell is callable and unavailable without authentication`() = runBlocking {
    val service: AuthenticationService = UnavailableAuthenticationService()
    val result = service.execute("resolveSession", JSONObject().put("generation", 42))
    assertEquals("unavailable", result.optString("status"))
    assertEquals(42, result.getInt("generation"))
    assertFalse(result.has("sessionId"))
    assertFalse(result.has("accountId"))
    service.observe { throw AssertionError("Shell must not authenticate") }.invoke()
  }
}

class AndroidAuthenticationContractTest {
  private class FakeSdk : AuthSdk {
    override var configured = true
    var session: ProviderSession? = null
    var next = ProviderAttempt("provider-attempt", "complete", "session-new")
    var failure: SafeAuthFailure? = null
    var refreshes = 0
    var preparations = mutableListOf<String>()
    var verifications = mutableListOf<String>()
    var activations = mutableListOf<String>()
    var ended = mutableListOf<String>()
    var transfer: Boolean? = null
    var endFailure: SafeAuthFailure? = null
    var currentFailure: Throwable? = null
    var clearBeforeEndFailure = false
    var invalidation: (() -> Unit)? = null
    var heldPassword: kotlinx.coroutines.CompletableDeferred<ProviderAttempt>? = null
    var heldGoogle: kotlinx.coroutines.CompletableDeferred<ProviderAttempt>? = null
    var cancellations = 0

    override suspend fun freshSession(): ProviderSession? {
      refreshes++
      failure?.let { throw it }
      return session
    }

    override fun currentSession(): ProviderSession? {
      currentFailure?.let { throw it }
      return session
    }

    override suspend fun password(email: String, password: String): ProviderAttempt =
      heldPassword?.await() ?: attempt()

    override suspend fun requestCode(email: String) = attempt()

    override suspend fun prepareCode(attempt: ProviderAttempt, purpose: String): ProviderAttempt {
      preparations.add(purpose)
      return attempt
    }

    override suspend fun verifyCode(
      attempt: ProviderAttempt,
      code: String,
      purpose: String,
    ): ProviderAttempt {
      verifications.add(purpose)
      return this.attempt()
    }

    override suspend fun google(transferable: Boolean): ProviderAttempt {
      transfer = transferable
      return heldGoogle?.await() ?: attempt()
    }

    override suspend fun activate(sessionId: String) {
      activations.add(sessionId)
      session = ProviderSession(sessionId, "account")
    }

    override suspend fun endSession(sessionId: String) {
      ended.add(sessionId)
      if (endFailure != null && !clearBeforeEndFailure) throw endFailure!!
      if (session?.id == sessionId) session = null
      endFailure?.let { throw it }
    }

    override fun observeInvalidation(listener: () -> Unit): () -> Unit {
      invalidation = listener
      return { invalidation = null }
    }

    override fun cancelPendingSignIn() {
      cancellations++
      heldGoogle?.completeExceptionally(SafeAuthFailure("cancelled"))
    }

    override fun clearAttempts() {}

    private fun attempt(): ProviderAttempt {
      failure?.let { throw it }
      return next
    }
  }

  private fun input(generation: Int = 1): JSONObject =
    JSONObject().put("generation", generation).put("operationId", "operation-$generation")

  private fun credentials() =
    input().put("email", "person@example.test").put("password", "SYNTHETIC_SECRET")

  @Test
  fun `S02 password completion activates then validates a real provider session`() = runBlocking {
    val sdk = FakeSdk()
    val service = ClerkAuthService(sdk)
    val result = service.execute("password", credentials())
    assertEquals("active", result.optString("status"))
    assertEquals(listOf("session-new"), sdk.activations)
    assertEquals(1, sdk.refreshes)
    assertEquals("account", result.optString("accountId"))
    assertFalse(result.toString().contains("SYNTHETIC_SECRET"))
  }

  @Test
  fun `S05 resolution refreshes cached session and blocks pending provider tasks`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("saved", "account", hasTasks = true)
    val result = ClerkAuthService(sdk).execute("resolveSession", input().put("forceFresh", true))
    assertEquals(1, sdk.refreshes)
    assertEquals("unavailable", result.optString("status"))
    assertEquals("verificationRequired", result.optJSONObject("error")?.optString("code"))
    assertFalse(result.has("accountId"))
  }

  @Test
  fun `S16 email code creates opaque challenge verifies and resends same attempt across generations`() =
    runBlocking {
      val sdk = FakeSdk()
      sdk.next =
        ProviderAttempt("provider-attempt", "needs_first_factor", emailFactorId = "email-factor")
      val service = ClerkAuthService(sdk)
      val challenge = service.execute("requestCode", input().put("email", "person@example.test"))
      assertEquals("challenge", challenge.optString("kind"))
      val id = challenge.optString("attemptId")
      assertFalse(id == "provider-attempt")
      val resend =
        service.execute("resendCode", input(2).put("attemptId", id).put("codePurpose", "signIn"))
      assertEquals(id, resend.optString("attemptId"))
      sdk.next = ProviderAttempt("provider-attempt", "complete", "session-new")
      val result =
        service.execute(
          "verifyCode",
          input(3).put("attemptId", id).put("codePurpose", "signIn").put("code", "SYNTHETIC_CODE"),
        )
      assertEquals("active", result.optString("status"))
      assertEquals(listOf("signIn", "signIn"), sdk.preparations)
      assertEquals(listOf("signIn"), sdk.verifications)
    }

  @Test
  fun `S19 password client trust uses email device verification before activation`() = runBlocking {
    val sdk = FakeSdk()
    sdk.next =
      ProviderAttempt("provider-attempt", "needs_client_trust", emailFactorId = "email-factor")
    val service = ClerkAuthService(sdk)
    val challenge = service.execute("password", credentials())
    assertEquals("deviceTrust", challenge.optString("codePurpose"))
    assertEquals(emptyList<String>(), sdk.activations)
    assertEquals(listOf("deviceTrust"), sdk.preparations)
    sdk.next = ProviderAttempt("provider-attempt", "complete", "session-new")
    val result =
      service.execute(
        "verifyCode",
        input(2)
          .put("attemptId", challenge.optString("attemptId"))
          .put("codePurpose", "deviceTrust")
          .put("code", "123456"),
      )
    assertEquals("active", result.optString("status"))
    assertEquals(listOf("deviceTrust"), sdk.verifications)
  }

  @Test
  fun `S20 unsupported MFA new password and unknown states never activate`() = runBlocking {
    for (status in listOf("needs_second_factor", "needs_new_password", "unknown")) {
      val sdk = FakeSdk()
      sdk.next = ProviderAttempt("attempt", status)
      val result = ClerkAuthService(sdk).execute("password", credentials())
      assertEquals("verificationRequired", result.optString("code"))
      assertEquals(emptyList<String>(), sdk.activations)
    }
  }

  @Test
  fun `S17 S18 Google forbids signup transfer and rejects unknown account`() = runBlocking {
    val sdk = FakeSdk()
    sdk.failure = SafeAuthFailure("existingAccountRequired")
    val result = ClerkAuthService(sdk).execute("google", input())
    assertEquals(false, sdk.transfer)
    assertEquals("existingAccountRequired", result.optString("code"))
    assertEquals(emptyList<String>(), sdk.activations)
  }

  @Test
  fun `S03 S04 S16 storage cancellation invalid expired and provider rate limit are sanitized`() =
    runBlocking {
      for (code in
        listOf("storage", "cancelled", "codeInvalid", "codeExpired", "rateLimited", "network")) {
        val sdk = FakeSdk()
        sdk.failure = SafeAuthFailure(code, if (code == "rateLimited") 11 else null)
        val result = ClerkAuthService(sdk).execute("password", credentials())
        assertEquals(code, result.optString("code"))
        if (code == "rateLimited") assertEquals(11, result.getInt("retryAfterSeconds"))
        assertFalse(result.toString().contains("SYNTHETIC_SECRET"))
      }
    }

  @Test
  fun `S07 native invalidation emits ordered credential-free signed out event`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("saved", "account")
    val service = ClerkAuthService(sdk)
    val events = mutableListOf<JSONObject>()
    val unsubscribe = service.observe { events.add(it) }
    val active = service.execute("resolveSession", input())
    sdk.session = null
    sdk.invalidation?.invoke()
    assertEquals(1, events.size)
    assertEquals("signedOut", events.single().optString("status"))
    org.junit.Assert.assertTrue(events.single().getLong("revision") > active.getLong("revision"))
    assertFalse(events.single().has("accountId"))
    unsubscribe()
    assertEquals(null, sdk.invalidation)
  }

  @Test
  fun `FR007 obsolete password completion ends its new session after abandon`() = runBlocking {
    val sdk = FakeSdk()
    val deferred = kotlinx.coroutines.CompletableDeferred<ProviderAttempt>()
    sdk.heldPassword = deferred
    val service = ClerkAuthService(sdk)
    val operation = async { service.execute("password", credentials()) }
    kotlinx.coroutines.yield()
    val abandoned = service.execute("abandon", input(2))
    deferred.complete(ProviderAttempt("provider-attempt", "complete", "session-obsolete"))
    val result = operation.await()
    assertEquals(
      "Pending native cleanup must not claim a cleared session",
      "unavailable",
      abandoned.optString("status"),
    )
    assertEquals(listOf("session-obsolete"), sdk.ended)
    assertFalse(result.optString("status") == "active")
  }

  @Test
  fun `S08 duplicate pending native command does not invalidate first operation`() = runBlocking {
    val sdk = FakeSdk()
    val deferred = kotlinx.coroutines.CompletableDeferred<ProviderAttempt>()
    sdk.heldPassword = deferred
    val service = ClerkAuthService(sdk)
    val first = async { service.execute("password", credentials()) }
    kotlinx.coroutines.yield()
    service.execute("password", credentials())
    deferred.complete(ProviderAttempt("provider-attempt", "complete", "session-new"))
    assertEquals("active", first.await().optString("status"))
    assertEquals(listOf("session-new"), sdk.activations)
  }

  @Test
  fun `FR007 failed obsolete cleanup keeps its persisted session quarantined`() = runBlocking {
    val sdk = FakeSdk()
    val deferred = kotlinx.coroutines.CompletableDeferred<ProviderAttempt>()
    sdk.heldPassword = deferred
    val service = ClerkAuthService(sdk)
    val first = async { service.execute("password", credentials()) }
    kotlinx.coroutines.yield()
    service.execute("abandon", input(2))
    sdk.session = ProviderSession("session-obsolete", "account")
    sdk.endFailure = SafeAuthFailure("network")
    deferred.complete(ProviderAttempt("provider-attempt", "complete", "session-obsolete"))
    first.await()
    val resolved = service.execute("resolveSession", input(3))
    assertEquals("unavailable", resolved.optString("status"))
    assertFalse(resolved.has("accountId"))
  }

  @Test
  fun `S09 signout ends only requested current session and returns cleared state`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("current", "account")
    val service = ClerkAuthService(sdk)
    service.execute("resolveSession", input())
    val result = service.execute("signOut", input(2).put("sessionId", "current"))
    assertEquals("signedOut", result.optString("status"))
    assertEquals(listOf("current"), sdk.ended)
    assertEquals(null, sdk.session)
    assertFalse(result.has("accountId"))
  }

  @Test
  fun `S10 remote signout failure before local clear returns freshly validated active with safe error`() =
    runBlocking {
      val sdk = FakeSdk()
      sdk.session = ProviderSession("current", "account")
      sdk.endFailure = SafeAuthFailure("network")
      val service = ClerkAuthService(sdk)
      service.execute("resolveSession", input())
      val result = service.execute("signOut", input(2).put("sessionId", "current"))
      assertEquals("active", result.optString("status"))
      assertEquals("network", result.optJSONObject("error")?.optString("code"))
      assertEquals(2, sdk.refreshes)
    }

  @Test
  fun `S10 partial signout failure after local clear returns signed out with safe error`() =
    runBlocking {
      val sdk = FakeSdk()
      sdk.session = ProviderSession("current", "account")
      sdk.endFailure = SafeAuthFailure("storage")
      sdk.clearBeforeEndFailure = true
      val service = ClerkAuthService(sdk)
      service.execute("resolveSession", input())
      val result = service.execute("signOut", input(2).put("sessionId", "current"))
      assertEquals("signedOut", result.optString("status"))
      assertEquals("storage", result.optJSONObject("error")?.optString("code"))
    }

  @Test
  fun `S10 signout with unresolved persistence cannot report success`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("current", "account")
    val service = ClerkAuthService(sdk)
    service.execute("resolveSession", input())
    sdk.failure = SafeAuthFailure("storage")
    sdk.endFailure = SafeAuthFailure("storage")
    val result = service.execute("signOut", input(2).put("sessionId", "current"))
    assertEquals("unavailable", result.optString("status"))
    assertEquals("storage", result.optJSONObject("error")?.optString("code"))
  }

  @Test
  fun `S09 obsolete signout request never ends a newer unrelated session`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("newer", "account")
    val service = ClerkAuthService(sdk)
    service.execute("resolveSession", input())
    service.execute("signOut", input(2).put("sessionId", "obsolete"))
    assertEquals(emptyList<String>(), sdk.ended)
  }

  @Test
  fun `FR012 SDK event inspection failure emits safe unavailable without throwing diagnostics`() =
    runBlocking {
      val sdk = FakeSdk()
      sdk.session = ProviderSession("saved", "account")
      val service = ClerkAuthService(sdk)
      val events = mutableListOf<JSONObject>()
      service.observe { events.add(it) }
      service.execute("resolveSession", input())
      sdk.currentFailure = java.security.GeneralSecurityException("SYNTHETIC_SECRET")
      sdk.invalidation?.invoke()
      assertEquals("unavailable", events.single().optString("status"))
      assertEquals("storage", events.single().optJSONObject("error")?.optString("code"))
      assertFalse(events.single().toString().contains("SYNTHETIC_SECRET"))
    }

  @Test
  fun `FR012 released event consumer cannot leak exception into SDK coroutine`() = runBlocking {
    val sdk = FakeSdk()
    sdk.session = ProviderSession("saved", "account")
    val service = ClerkAuthService(sdk)
    service.observe { throw IllegalStateException("SYNTHETIC_SECRET") }
    service.execute("resolveSession", input())
    sdk.session = null
    sdk.invalidation?.invoke()
    Unit
  }

  @Test
  fun `S17 abandoned Google releases SDK pending flow and allows following password method`() =
    runBlocking {
      val sdk = FakeSdk()
      val deferred = kotlinx.coroutines.CompletableDeferred<ProviderAttempt>()
      sdk.heldGoogle = deferred
      val service = ClerkAuthService(sdk)
      val google = async { service.execute("google", input()) }
      kotlinx.coroutines.yield()
      service.execute("abandon", input(2))
      val password = service.execute("password", credentials().put("generation", 3))
      if (!deferred.isCompleted) deferred.completeExceptionally(SafeAuthFailure("cancelled"))
      google.await()
      assertEquals(1, sdk.cancellations)
      assertEquals("active", password.optString("status"))
    }

  @Test
  fun `configuration missing fails closed without SDK access`() = runBlocking {
    val sdk = FakeSdk()
    sdk.configured = false
    val result = ClerkAuthService(sdk).execute("password", credentials())
    assertEquals("configuration", result.optString("code"))
    assertEquals(0, sdk.refreshes)
  }
}

class AndroidBootstrapContractTest {
  @Test
  fun `T023 missing publishable configuration never initializes SDK`() {
    var calls = 0
    org.junit.Assert.assertFalse(AuthBootstrap.initialize("") { calls++ })
    assertEquals(0, calls)
  }

  @Test
  fun `T023 public publishable configuration initializes once without crash`() {
    val keys = mutableListOf<String>()
    org.junit.Assert.assertTrue(
      AuthBootstrap.initialize("pk_test_SYNTHETIC_PUBLIC") { keys.add(it) }
    )
    assertEquals(listOf("pk_test_SYNTHETIC_PUBLIC"), keys)
    org.junit.Assert.assertFalse(
      AuthBootstrap.initialize("pk_test_SYNTHETIC_PUBLIC") {
        throw IllegalArgumentException("SYNTHETIC_SECRET")
      }
    )
  }
}
