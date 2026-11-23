package si.tryweave.notifications

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import si.tryweave.auth.*

class NotificationAuthorityTest {
  @Test fun `S03 only native validated task-free session authorizes notification credentials`() = runTest {
    val sdk = AuthoritySdk()
    val service = ClerkAuthService(sdk)
    assertNull(service.capture())
    service.execute("resolveSession", JSONObject().put("generation", 100))
    assertNotNull("Validated native session must authorize notifications", service.capture())
    val captured = service.capture()!!
    assertEquals("account-a", captured.accountId)
    assertEquals("SYNTHETIC_TOKEN", service.token(captured))
    sdk.session = sdk.session!!.copy(hasTasks = true)
    assertNull(service.capture())
    assertNull(service.token(captured))
  }

  @Test fun `S04 signout invalidates native epoch immediately while SDK operation is pending`() = runTest {
    val sdk = AuthoritySdk()
    val service = ClerkAuthService(sdk)
    service.execute("resolveSession", JSONObject().put("generation", 1))
    assertNotNull("Validated native session must authorize notifications", service.capture())
    val captured = service.capture()!!
    var invalidations = 0
    service.observeInvalidation { invalidations++ }
    sdk.endGate = CompletableDeferred()
    val pending = async { service.execute("signOut", JSONObject().put("generation", 2).put("sessionId", "session-a")) }
    yield()
    assertNull(service.capture())
    assertNull(service.token(captured))
    assertTrue(invalidations > 0)
    sdk.endGate!!.complete(Unit)
    pending.await()
  }

  @Test fun `S09 unchanged native session emission preserves validated notification authority`() = runTest {
    val sdk = AuthoritySdk(); val service = ClerkAuthService(sdk)
    service.execute("resolveSession", JSONObject().put("generation", 1))
    val before = service.capture()
    service.observeInvalidation {}
    sdk.changed!!.invoke()
    assertEquals(before, service.capture())
  }

  @Test fun `S04 native SDK A B A invalidation fences captured authority without JS observers`() = runTest {
    val sdk = AuthoritySdk()
    val service = ClerkAuthService(sdk)
    service.execute("resolveSession", JSONObject().put("generation", 1))
    assertNotNull("Validated native session must authorize notifications", service.capture())
    val before = service.capture()!!
    var invalidations = 0
    val remove = service.observeInvalidation { invalidations++ }
    sdk.session = ProviderSession("session-b", "account-b")
    sdk.changed!!.invoke()
    sdk.session = ProviderSession("session-a", "account-a")
    sdk.changed!!.invoke()
    assertTrue(invalidations > 0)
    assertNotEquals(before, service.capture())
    assertNull(service.token(before))
    remove()
  }
}

private class AuthoritySdk : AuthSdk {
  override val configured = true
  var session: ProviderSession? = ProviderSession("session-a", "account-a")
  var changed: (() -> Unit)? = null
  var endGate: CompletableDeferred<Unit>? = null
  override fun currentSession() = session
  override suspend fun freshSession() = session
  override suspend fun tokenForSession(sessionId: String) = "SYNTHETIC_TOKEN"
  override fun observeInvalidation(listener: () -> Unit): () -> Unit { changed = listener; return { changed = null } }
  override suspend fun endSession(sessionId: String) { endGate?.await(); session = null }
  override suspend fun activate(sessionId: String) {}
  override fun clearAttempts() {}
  override suspend fun password(email: String, password: String) = error("unused")
  override suspend fun requestCode(email: String) = error("unused")
  override suspend fun prepareCode(attempt: ProviderAttempt, purpose: String) = error("unused")
  override suspend fun verifyCode(attempt: ProviderAttempt, code: String, purpose: String) = error("unused")
  override suspend fun google(transferable: Boolean) = error("unused")
}
