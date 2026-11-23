package si.tryweave.notifications

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import si.tryweave.auth.NativeWeaveNotificationsSpec

class WeaveNotificationsModule(context: ReactApplicationContext, private val coordinator: NotificationCoordinator) : NativeWeaveNotificationsSpec(context) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val unsubscribe = coordinator.observe {
    if (mEventEmitterCallback != null) emitOnNotificationChanged(it.toString())
  }
  override fun getName() = NAME
  override fun execute(command: String, payload: String, promise: Promise) {
    scope.launch { promise.resolve(coordinator.execute(command, payload).toString()) }
  }
  override fun invalidate() {
    unsubscribe()
    scope.cancel()
    super.invalidate()
  }
  companion object { const val NAME = "WeaveNotifications" }
}
