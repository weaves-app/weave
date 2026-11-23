package si.tryweave.notifications

import android.app.Application
import android.os.SystemClock
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import si.tryweave.BuildConfig
import si.tryweave.auth.AuthDependencies
import si.tryweave.auth.BoundedNotificationHttpClient
import si.tryweave.auth.ClerkSessionAuthorizedTransport

/** Application lifetime is deliberately independent of any React root or bridge lifetime. */
object NotificationDependencies {
  @Volatile private var instance: NotificationCoordinator? = null
  @Synchronized fun initialize(application: Application): NotificationCoordinator {
    instance?.let { return it }
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    val provider = OneSignalNotificationProvider(application, BuildConfig.ONESIGNAL_APP_ID, BuildConfig.NOTIFICATIONS_API_ORIGIN, scope)
    val clock = object : NotificationClock {
      override fun monotonicMilliseconds() = SystemClock.elapsedRealtime()
      override fun wallMilliseconds() = System.currentTimeMillis()
    }
    val authority = AuthDependencies.notificationAuthority
    val coordinator = NotificationCoordinator(authority, ClerkSessionAuthorizedTransport(authority,
      BoundedNotificationHttpClient(BuildConfig.NOTIFICATIONS_API_ORIGIN)), provider, clock, scope)
    provider.eligibleForPresentation = coordinator::shouldDisplay
    instance = coordinator
    coordinator.start()
    return coordinator
  }
}
