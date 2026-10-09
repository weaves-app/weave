package si.tryweave.auth

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

class WeaveAuthModule(
  context: ReactApplicationContext,
  private val service: AuthenticationService = UnavailableAuthenticationService(),
) : NativeWeaveAuthSpec(context) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val unsubscribe = service.observe {
    if (mEventEmitterCallback != null) emitOnSessionChanged(it.toString())
  }

  override fun getName(): String = NAME

  override fun execute(command: String, payload: String, promise: Promise) {
    scope.launch {
      val result =
        try {
          service.execute(command, JSONObject(payload))
        } catch (_: Throwable) {
          JSONObject().put("kind", "error").put("code", "unexpected")
        }
      promise.resolve(result.toString())
    }
  }

  override fun invalidate() {
    unsubscribe()
    service.release()
    scope.cancel()
    super.invalidate()
  }

  companion object {
    const val NAME = "WeaveAuth"
  }
}
