package si.tryweave.auth

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify

@OptIn(ExperimentalCoroutinesApi::class)
class WeaveAuthBridgeTest {
  @Before
  fun setDispatcher() {
    Dispatchers.setMain(UnconfinedTestDispatcher())
  }

  @After
  fun resetDispatcher() {
    Dispatchers.resetMain()
  }

  @Test
  fun `T008 actual generated bridge resolves callable injected shell`() {
    val service = UnavailableAuthenticationService()
    val module = WeaveAuthModule(mock(ReactApplicationContext::class.java), service)
    val promise = mock(Promise::class.java)
    module.execute("resolveSession", "{\"generation\":42}", promise)
    val capture = org.mockito.ArgumentCaptor.forClass(Any::class.java)
    verify(promise).resolve(capture.capture())
    org.junit.Assert.assertEquals(
      "unavailable",
      JSONObject(capture.value as String).getString("status"),
    )
    module.invalidate()
  }

  @Test
  fun `FR012 malformed boundary payload resolves safe error without raw values`() {
    val module =
      WeaveAuthModule(mock(ReactApplicationContext::class.java), UnavailableAuthenticationService())
    val promise = mock(Promise::class.java)
    module.execute("password", "SYNTHETIC_SECRET_NOT_JSON", promise)
    val capture = org.mockito.ArgumentCaptor.forClass(Any::class.java)
    verify(promise).resolve(capture.capture())
    val result = JSONObject(capture.value as String)
    org.junit.Assert.assertEquals("unexpected", result.getString("code"))
    org.junit.Assert.assertFalse(result.toString().contains("SYNTHETIC_SECRET"))
    module.invalidate()
  }
}
