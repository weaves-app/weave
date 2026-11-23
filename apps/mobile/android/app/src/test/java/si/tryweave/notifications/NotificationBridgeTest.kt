package si.tryweave.notifications

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.*

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationBridgeTest {
  @Test fun `S09 generated notification bridge retains auth mapping and releases only its event consumer`() = runTest {
    Dispatchers.setMain(UnconfinedTestDispatcher(testScheduler))
    try {
      val fixture = CoordinatorFixture(backgroundScope)
      val module = WeaveNotificationsModule(mock(ReactApplicationContext::class.java), fixture.coordinator)
      val promise = mock(Promise::class.java)
      module.execute("acquire", NotificationCoordinatorTest.wire(generation = 0).toString(), promise)
      val capture = ArgumentCaptor.forClass(Any::class.java)
      verify(promise).resolve(capture.capture())
      assertEquals("observation", JSONObject(capture.value as String).getString("kind"))
      module.invalidate()
      assertEquals("observation", fixture.reconcile().getString("kind"))
      assertEquals(1, fixture.provider.initializations)
    } finally { Dispatchers.resetMain() }
  }
}
