package si.tryweave.notifications

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import com.onesignal.OneSignal
import com.onesignal.IUserJwtInvalidatedListener
import com.onesignal.UserJwtInvalidatedEvent
import com.onesignal.debug.LogLevel
import com.onesignal.notifications.IPermissionObserver
import com.onesignal.user.state.IUserStateObserver
import com.onesignal.user.state.UserChangedState
import com.onesignal.user.subscriptions.IPushSubscriptionObserver
import com.onesignal.user.subscriptions.PushSubscriptionChangedState
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import si.tryweave.auth.BoundedNotificationHttpClient

/** One process owns the SDK. Raw payloads and provider identifiers stay in native code. */
class OneSignalNotificationProvider(
  private val application: Application,
  private val appId: String,
  apiOrigin: String,
  private val scope: CoroutineScope,
) : NotificationProvider {
  override val configured = appId.matches(Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) && BoundedNotificationHttpClient.validOrigin(apiOrigin)
  @Volatile private var initialized = false
  private var change = 0L
  private val observers = mutableSetOf<() -> Unit>()
  private val jwtObservers = mutableSetOf<(String) -> Unit>()
  private var settingsReturn: CompletableDeferred<Unit>? = null
  private var settingsPaused = false
  private var activeActivity: java.lang.ref.WeakReference<Activity>? = null
  var eligibleForPresentation: () -> Boolean = { false }

  private fun changed() { scope.launch { change++; observers.toList().forEach { try { it() } catch (_: Exception) {} } } }
  private val permissionObserver = object : IPermissionObserver {
    override fun onNotificationPermissionChange(permission: Boolean) = changed()
  }
  private val userObserver = object : IUserStateObserver {
    override fun onUserStateChange(state: UserChangedState) = changed()
  }
  private val subscriptionObserver = object : IPushSubscriptionObserver {
    override fun onPushSubscriptionChange(state: PushSubscriptionChangedState) = changed()
  }
  private val jwtObserver = object : IUserJwtInvalidatedListener {
    override fun onUserJwtInvalidated(event: UserJwtInvalidatedEvent) {
      scope.launch { jwtObservers.toList().forEach { try { it(event.externalId) } catch (_: Exception) {} } }
    }
  }
  private val presentation = NotificationPresentationAdapter { eligibleForPresentation() }
  private val lifecycle = object : Application.ActivityLifecycleCallbacks {
    override fun onActivityResumed(activity: Activity) {
      activeActivity = java.lang.ref.WeakReference(activity)
      changed()
      if (settingsPaused) settingsReturn?.complete(Unit)
    }
    override fun onActivityPaused(activity: Activity) { if (settingsReturn != null) settingsPaused = true }
    override fun onActivityCreated(activity: Activity, state: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) { if (activeActivity?.get() === activity) activeActivity = null }
  }

  override suspend fun initialize(): Boolean {
    if (initialized) return true
    if (!configured) return false
    // The SDK logs identity and JWT suffixes at DEBUG, including its suspend identity APIs.
    OneSignal.Debug.logLevel = LogLevel.NONE
    OneSignal.Debug.alertLevel = LogLevel.NONE
    if (!OneSignal.initWithContextSuspend(application, appId)) return false
    OneSignal.Notifications.addPermissionObserver(permissionObserver)
    OneSignal.User.addObserver(userObserver)
    OneSignal.User.pushSubscription.addObserver(subscriptionObserver)
    OneSignal.addUserJwtInvalidatedListener(jwtObserver)
    OneSignal.Notifications.addForegroundLifecycleListener(presentation)
    application.registerActivityLifecycleCallbacks(lifecycle)
    initialized = true
    return true
  }

  override fun snapshot(): AndroidNotificationPermissionSnapshot {
    if (!initialized) return AndroidNotificationPermissionSnapshot(Build.VERSION.SDK_INT, false, false, available = false)
    // SDK owns persisted permission resolution; the OS rationale can identify a prior denial.
    // PackageManager permission flags are privileged hidden APIs, so never reflect into them.
    val canRequest = application.applicationInfo.targetSdkVersion >= 33 && OneSignal.Notifications.canRequestPermission
    val requested = !canRequest || (Build.VERSION.SDK_INT >= 33 &&
      activeActivity?.get()?.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) == true)
    return AndroidNotificationPermissionSnapshot(
      Build.VERSION.SDK_INT, OneSignal.Notifications.permission,
      canRequest, hasRequestedPermission = requested,
    )
  }

  override fun installation(): NotificationInstallation {
    if (!initialized) return NotificationInstallation("", false, false, "", change)
    val push = OneSignal.User.pushSubscription
    return NotificationInstallation(push.id, push.token.isNotBlank(), push.optedIn, OneSignal.User.externalId, change)
  }
  override fun observe(listener: () -> Unit): () -> Unit { observers.add(listener); return { observers.remove(listener) } }
  override fun observeJwtInvalidation(listener: (String) -> Unit): () -> Unit { jwtObservers.add(listener); return { jwtObservers.remove(listener) } }
  override suspend fun bind(externalId: String, jwt: String) {
    if (OneSignal.User.externalId == externalId) OneSignal.updateUserJwtSuspend(externalId, jwt)
    else OneSignal.loginSuspend(externalId, jwt)
  }
  override suspend fun logout() = OneSignal.logoutSuspend()
  override fun optIn() = OneSignal.User.pushSubscription.optIn()
  override fun optOut() = OneSignal.User.pushSubscription.optOut()
  override suspend fun requestPermission(fallbackToSettings: Boolean) { OneSignal.Notifications.requestPermission(false) }
  override suspend fun openNotificationSettings() {
    val returned = CompletableDeferred<Unit>()
    settingsReturn = returned; settingsPaused = false
    try {
      val intent = if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, application.packageName)
      else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", application.packageName, null))
      application.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      withTimeoutOrNull(30000) { returned.await() }
    } finally { if (settingsReturn === returned) settingsReturn = null }
  }
}
