package com.clerk.api.sso

import android.content.SharedPreferences
import com.clerk.api.Clerk
import com.clerk.api.network.model.error.ClerkErrorResponse
import com.clerk.api.network.serialization.ClerkResult
import com.clerk.api.session.Session
import com.clerk.api.storage.StorageHelper
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verifyNoInteractions

/** Inject only SDK-owned pending/resource state; no remote account/network/device fixture. */
class WeaveAuthenticationBridgeTest {
  @Test
  fun `S17 cancellation completes SDK pending flow without clearing cached session or secure store`() {
    val pending = CompletableDeferred<ClerkResult<OAuthResult, ClerkErrorResponse>>()
    val pendingField =
      SSOService::class.java.getDeclaredField("currentPendingAuth").apply { isAccessible = true }
    val storeField =
      StorageHelper::class.java.getDeclaredField("secureStorage").apply { isAccessible = true }
    val sessionField = Clerk::class.java.getDeclaredField("_session").apply { isAccessible = true }
    @Suppress("UNCHECKED_CAST")
    val sessionFlow = sessionField.get(Clerk) as MutableStateFlow<Session?>
    val previousSession = sessionFlow.value
    val previousStore = storeField.get(StorageHelper)
    val preferences = mock(SharedPreferences::class.java)
    val session = mock(Session::class.java)
    try {
      storeField.set(StorageHelper, preferences)
      sessionFlow.value = session
      pendingField.set(SSOService, pending)
      WeaveAuthenticationBridge.cancelPendingSignIn()
      assertTrue("Pending Google flow must complete", pending.isCompleted)
      val outcome = kotlinx.coroutines.runBlocking { pending.await() }
      assertTrue(
        "SDK cancellation must resolve as cancellation",
        outcome is ClerkResult.Failure && outcome.throwable is SSOCancellationException,
      )
      assertFalse(
        "SDK callback must no longer recognize an abandoned flow",
        SSOService.hasPendingAuthentication(),
      )
      assertSame("Cached native session must survive cancellation", session, Clerk.session)
      verifyNoInteractions(preferences)
    } finally {
      pendingField.set(SSOService, null)
      sessionFlow.value = previousSession
      storeField.set(StorageHelper, previousStore)
    }
  }
}
