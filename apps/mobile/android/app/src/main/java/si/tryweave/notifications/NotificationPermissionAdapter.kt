package si.tryweave.notifications

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred

enum class NotificationPermission { UNDETERMINED, ALLOWED, DENIED, RESTRICTED, UNAVAILABLE }

data class NotificationPermissionObservation(
  val permission: NotificationPermission,
  val canRequest: Boolean,
)

/** OS/SDK state, including native request history; never inferred from JS state. */
data class AndroidNotificationPermissionSnapshot(
  val apiLevel: Int,
  val notificationsEnabled: Boolean,
  val canRequestPermission: Boolean,
  val hasRequestedPermission: Boolean = false,
  val restricted: Boolean = false,
  val available: Boolean = true,
)

interface AndroidNotificationPermissionPlatform {
  fun snapshot(): AndroidNotificationPermissionSnapshot
  suspend fun requestPermission(fallbackToSettings: Boolean)
  suspend fun openNotificationSettings()
}

/** Only explicit enable/settings operations can invoke an OS-facing side effect. */
class NotificationPermissionAdapter(private val platform: AndroidNotificationPermissionPlatform) {
  private val permissionOperation = PermissionOperation<NotificationPermissionObservation>()
  private val settingsOperation = PermissionOperation<Boolean>()

  fun observe(): NotificationPermissionObservation {
    val state = try {
      platform.snapshot()
    } catch (cancelled: CancellationException) {
      throw cancelled
    } catch (_: Exception) {
      return UNAVAILABLE_OBSERVATION
    }
    val permission = when {
      !state.available -> NotificationPermission.UNAVAILABLE
      state.restricted -> NotificationPermission.RESTRICTED
      state.notificationsEnabled -> NotificationPermission.ALLOWED
      state.apiLevel < RUNTIME_PERMISSION_API -> NotificationPermission.DENIED
      state.hasRequestedPermission || !state.canRequestPermission -> NotificationPermission.DENIED
      else -> NotificationPermission.UNDETERMINED
    }
    val canRequest = state.apiLevel >= RUNTIME_PERMISSION_API && state.canRequestPermission &&
      (permission == NotificationPermission.UNDETERMINED || permission == NotificationPermission.DENIED)

    return NotificationPermissionObservation(permission, canRequest)
  }

  suspend fun enable(): NotificationPermissionObservation = permissionOperation.run {
    try {
      if (observe().canRequest) platform.requestPermission(fallbackToSettings = false)
      observe()
    } catch (cancelled: CancellationException) {
      throw cancelled
    } catch (_: Exception) {
      UNAVAILABLE_OBSERVATION
    }
  }

  suspend fun openSettings(): Boolean = settingsOperation.run {
    try {
      if (observe().permission == NotificationPermission.UNAVAILABLE) {
        false
      } else {
        platform.openNotificationSettings()
        true
      }
    } catch (cancelled: CancellationException) {
      throw cancelled
    } catch (_: Exception) {
      false
    }
  }

  private companion object {
    const val RUNTIME_PERMISSION_API = 33
    val UNAVAILABLE_OBSERVATION = NotificationPermissionObservation(NotificationPermission.UNAVAILABLE, false)
  }
}

private class PermissionOperation<T> {
  private var pending: CompletableDeferred<T>? = null

  suspend fun run(operation: suspend () -> T): T {
    val (result, owner) = synchronized(this) {
      val current = pending
      if (current != null) current to false
      else CompletableDeferred<T>().also { pending = it } to true
    }
    if (!owner) return result.await()

    try {
      return operation().also { result.complete(it) }
    } catch (failure: Throwable) {
      result.completeExceptionally(failure)
      throw failure
    } finally {
      synchronized(this) { pending = null }
    }
  }
}
