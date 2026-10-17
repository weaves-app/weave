package si.tryweave.notifications

import com.onesignal.notifications.INotificationLifecycleListener
import com.onesignal.notifications.INotificationWillDisplayEvent

class NotificationPresentationAdapter(private val eligible: () -> Boolean) : INotificationLifecycleListener {
  override fun onWillDisplay(event: INotificationWillDisplayEvent) {
    val allowed = try { eligible() } catch (_: Exception) { false }
    if (!allowed) event.preventDefault()
  }
}
