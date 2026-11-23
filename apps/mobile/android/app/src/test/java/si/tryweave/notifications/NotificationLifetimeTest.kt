package si.tryweave.notifications

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationLifetimeTest {
  @Test fun `S09 pending signed SDK bind is cleaned before a stale completion can enable delivery`() = runTest {
    val f = CoordinatorFixture(this); f.acquire()
    f.provider.bindGate = CompletableDeferred()
    val binding = async { f.reconcile() }; runCurrent()
    f.auth.invalidate()
    assertFalse(f.coordinator.shouldDisplay())
    f.provider.bindGate!!.complete(Unit)
    binding.await(); runCurrent()
    assertEquals("", f.provider.state.externalId)
    assertEquals(0, f.provider.optOuts)
    assertFalse(f.coordinator.shouldDisplay())
  }
}
