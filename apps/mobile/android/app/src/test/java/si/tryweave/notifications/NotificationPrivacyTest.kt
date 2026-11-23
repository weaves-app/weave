package si.tryweave.notifications

import android.app.Application
import com.onesignal.OneSignal
import com.onesignal.debug.IDebugManager
import com.onesignal.debug.LogLevel
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Mockito.*
import si.tryweave.auth.NotificationHttpResult

class NotificationPrivacyTest {
  @Test fun `S10 trailing data invalidates entire grant and never binds sentinel credentials`() = runTest {
    val f = CoordinatorFixture(this)
    f.transport.response = (f.transport.grant() as NotificationHttpResult.Response).let {
      it.copy(body = it.body + " {\"private\":\"SYNTHETIC_PRIVATE_PAYLOAD\"}")
    }
    val events = mutableListOf<String>()
    f.coordinator.observe { events.add(it.toString()) }
    f.acquire(); val result = f.reconcile()
    assertTrue(f.provider.bindings.isEmpty())
    assertFalse(result.getBoolean("matchesCurrentAccount"))
    assertFalse((events + result.toString()).joinToString().contains("SYNTHETIC"))
  }

  @Test fun `S10 provider error body never becomes a bridge message or observation`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); val observed = f.reconcile()
    f.transport.response = NotificationHttpResult.Response(503, "{\"message\":\"SYNTHETIC_TOKEN PRIVATE_PAYLOAD\",\"subscriptionId\":\"PRIVATE_ID\"}")
    val result = f.refresh(observed.getLong("revision"), "1")
    assertEquals("unavailable", result.getString("status"))
    assertFalse(result.toString().contains("SYNTHETIC"))
    assertFalse(result.toString().contains("PRIVATE"))
    assertEquals(setOf("version", "kind", "rootLease", "generation", "revision", "attemptId", "status", "remainingValidityMs"), result.keys().asSequence().toSet())
  }

  @Test fun `S10 asynchronous SDK cleanup errors never reach process exception logging`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile()
    f.provider.logoutFailure = IllegalStateException("SYNTHETIC_PRIVATE_SDK_EXCEPTION")
    f.auth.invalidate()
    kotlinx.coroutines.yield()
    assertFalse(f.coordinator.shouldDisplay())
  }

  @Test fun `S10 actual SDK logging is disabled before initialization can handle identity`() = runTest {
    val debug = mock(IDebugManager::class.java)
    mockStatic(OneSignal::class.java) { call ->
      when (call.method.name) {
        "getDebug" -> debug
        "initWithContextSuspend" -> {
          verify(debug).logLevel = LogLevel.NONE
          verify(debug).alertLevel = LogLevel.NONE
          false
        }
        else -> null
      }
    }.use {
      val provider = OneSignalNotificationProvider(mock(Application::class.java),
        "01234567-89ab-cdef-0123-456789abcdef", "https://api.example.test", this)
      assertFalse(provider.initialize())
    }
  }
}
