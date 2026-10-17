package si.tryweave.notifications

import java.io.ByteArrayInputStream
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import si.tryweave.auth.*

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationAccountTest {
  @Test fun `S03 native captured authority sends one current token to fixed allowlisted path`() = runTest {
    val auth = TestNotificationAuthority()
    val http = TestNotificationHttp()
    val result = ClerkSessionAuthorizedTransport(auth, http).execute(context(), NotificationHttpRequest(NotificationHttpOperation.IDENTITY_GRANT))
    assertEquals(NotificationHttpResult.Response(200, "{}"), result)
    assertEquals(listOf(Triple("/api/notifications/identity-grant", "SYNTHETIC_CLERK_TOKEN", "{}")), http.calls)
  }

  @Test fun `S04 token completion after A B A native authority epochs never sends request`() = runTest {
    val auth = TestNotificationAuthority()
    auth.heldToken = CompletableDeferred()
    val http = TestNotificationHttp()
    val pending = async { ClerkSessionAuthorizedTransport(auth, http).execute(context(), NotificationHttpRequest(NotificationHttpOperation.IDENTITY_GRANT)) }
    runCurrent()
    auth.current = auth.current!!.copy(epoch = 3)
    auth.heldToken!!.complete("SYNTHETIC_OLD_TOKEN")
    assertEquals(NotificationHttpResult.Stale, pending.await())
    assertTrue(http.calls.isEmpty())
  }

  @Test fun `S04 HTTP response after signout is stale and leaves auth untouched`() = runTest {
    val auth = TestNotificationAuthority()
    val http = TestNotificationHttp()
    http.held = CompletableDeferred()
    val pending = async { ClerkSessionAuthorizedTransport(auth, http).execute(context(), NotificationHttpRequest(NotificationHttpOperation.IDENTITY_GRANT)) }
    runCurrent()
    auth.current = null
    http.held!!.complete(NotificationHttpResult.Response(200, "SYNTHETIC_SECRET"))
    assertEquals(NotificationHttpResult.Stale, pending.await())
    assertNull(auth.current)
  }

  @Test fun `S08 token and HTTP waits each stop at five seconds without retries`() = runTest {
    for (tokenHeld in listOf(true, false)) {
      val auth = TestNotificationAuthority()
      val http = TestNotificationHttp()
      if (tokenHeld) auth.heldToken = CompletableDeferred() else http.held = CompletableDeferred()
      val pending = async { ClerkSessionAuthorizedTransport(auth, http).execute(context(), NotificationHttpRequest(NotificationHttpOperation.IDENTITY_GRANT)) }
      runCurrent(); advanceTimeBy(4999); runCurrent()
      assertFalse(pending.isCompleted)
      advanceTimeBy(1); runCurrent()
      assertEquals(NotificationHttpResult.Unavailable, pending.await())
      assertEquals(if (tokenHeld) 0 else 1, http.calls.size)
    }
  }

  @Test fun `S10 decoded response bytes are capped at 16 KiB on success and errors`() {
    for (status in listOf(200, 503)) {
      for (size in listOf(16383, 16384, 16385)) {
        val result = BoundedNotificationHttpClient.read(status, ByteArrayInputStream(ByteArray(size) { 120 }))
        if (size <= 16384) assertEquals(NotificationHttpResult.Response(status, "x".repeat(size)), result)
        else assertEquals(NotificationHttpResult.Unavailable, result)
      }
    }
  }

  @Test fun `S10 transport origin excludes insecure URLs credentials paths and redirects`() {
    assertTrue(BoundedNotificationHttpClient.validOrigin("https://api.example.test"))
    for (origin in listOf("http://api.example.test", "https://user:secret@api.example.test", "https://api.example.test/path", "https://api.example.test?q=x", "https://api.example.test#fragment")) assertFalse(BoundedNotificationHttpClient.validOrigin(origin))
    assertEquals(NotificationHttpResult.Unavailable, BoundedNotificationHttpClient.read(302, ByteArrayInputStream(byteArrayOf())))
  }

  private fun context() = NotificationSessionContext("session-a", "account-a", 7)
}

class TestNotificationAuthority : NativeNotificationAuthAuthority {
  var current: AuthorizedNotificationSession? = AuthorizedNotificationSession("session-a", "account-a", 1)
  var heldToken: CompletableDeferred<String?>? = null
  val listeners = mutableSetOf<() -> Unit>()
  override fun capture() = current
  override suspend fun token(session: AuthorizedNotificationSession) = heldToken?.await() ?: "SYNTHETIC_CLERK_TOKEN"
  override fun observeInvalidation(listener: () -> Unit): () -> Unit { listeners.add(listener); return { listeners.remove(listener) } }
  fun invalidate() { current = null; listeners.toList().forEach { it() } }
}

class TestNotificationHttp : NotificationHttpClient {
  val calls = mutableListOf<Triple<String, String, String>>()
  var held: CompletableDeferred<NotificationHttpResult>? = null
  override suspend fun post(path: String, token: String, body: String): NotificationHttpResult {
    calls.add(Triple(path, token, body))
    return held?.await() ?: NotificationHttpResult.Response(200, "{}")
  }
}
