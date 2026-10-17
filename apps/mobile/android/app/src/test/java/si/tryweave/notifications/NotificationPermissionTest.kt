package si.tryweave.notifications

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationPermissionTest {
  @Test
  fun `S01 observation and foreground settings return remain silent`() {
    val platform = PermissionPlatform()
    val adapter = NotificationPermissionAdapter(platform)
    repeat(3) { assertEquals(NotificationPermission.UNDETERMINED, adapter.observe().permission) }
    platform.state = platform.state.copy(notificationsEnabled = true)
    assertEquals(NotificationPermission.ALLOWED, adapter.observe().permission)
    assertEquals(0, platform.requests)
    assertEquals(0, platform.settings)
  }

  @Test
  fun `S02 Android runtime permission normalizes OS observations and native request history`() {
    val fixtures = listOf(
      Triple(AndroidNotificationPermissionSnapshot(33, false, true), NotificationPermission.UNDETERMINED, true),
      Triple(AndroidNotificationPermissionSnapshot(36, false, true, true), NotificationPermission.DENIED, true),
      Triple(AndroidNotificationPermissionSnapshot(36, false, false, true), NotificationPermission.DENIED, false),
      Triple(AndroidNotificationPermissionSnapshot(36, true, true), NotificationPermission.ALLOWED, false),
      Triple(AndroidNotificationPermissionSnapshot(36, false, true, restricted = true), NotificationPermission.RESTRICTED, false),
      Triple(AndroidNotificationPermissionSnapshot(36, false, true, available = false), NotificationPermission.UNAVAILABLE, false),
    )
    for ((raw, permission, canRequest) in fixtures) {
      val adapter = NotificationPermissionAdapter(PermissionPlatform(raw))
      assertEquals(NotificationPermissionObservation(permission, canRequest), adapter.observe())
    }
  }

  @Test
  fun `S02 Android before 33 never offers runtime permission even if SDK says requestable`() = runTest {
    for (enabled in listOf(true, false)) {
      val platform = PermissionPlatform(AndroidNotificationPermissionSnapshot(32, enabled, true))
      val adapter = NotificationPermissionAdapter(platform)
      assertEquals(if (enabled) NotificationPermission.ALLOWED else NotificationPermission.DENIED, adapter.enable().permission)
      assertFalse(adapter.observe().canRequest)
      assertEquals(0, platform.requests)
      assertEquals(0, platform.settings)
    }
  }

  @Test
  fun `S01 explicit Enable double tap coalesces one request without settings fallback`() = runTest {
    val platform = PermissionPlatform()
    val gate = CompletableDeferred<Unit>()
    platform.requestGate = gate
    val adapter = NotificationPermissionAdapter(platform)
    val first = async { adapter.enable() }
    val second = async { adapter.enable() }
    runCurrent()
    assertEquals(1, platform.requests)
    assertEquals(listOf(false), platform.fallbacks)
    platform.state = platform.state.copy(notificationsEnabled = true)
    gate.complete(Unit)
    assertEquals(NotificationPermissionObservation(NotificationPermission.ALLOWED, false), first.await())
    assertEquals(first.await(), second.await())
    adapter.enable()
    assertEquals(1, platform.requests)
    assertEquals(0, platform.settings)
  }

  @Test
  fun `S02 denial and dismissal use observed OS state without automatically opening settings`() = runTest {
    for (dismissed in listOf(true, false)) {
      val platform = PermissionPlatform()
      platform.afterRequest = AndroidNotificationPermissionSnapshot(36, false, dismissed, !dismissed)
      val result = NotificationPermissionAdapter(platform).enable()
      assertEquals(1, platform.requests)
      assertEquals(if (dismissed) NotificationPermission.UNDETERMINED else NotificationPermission.DENIED, result.permission)
      assertEquals(dismissed, result.canRequest)
      assertEquals(0, platform.settings)
    }
  }

  @Test
  fun `S02 denied nonrequestable and restricted permissions never request or fall back to settings`() = runTest {
    for (restricted in listOf(false, true)) {
      val platform = PermissionPlatform(AndroidNotificationPermissionSnapshot(36, false, false, true, restricted))
      val result = NotificationPermissionAdapter(platform).enable()
      assertEquals(if (restricted) NotificationPermission.RESTRICTED else NotificationPermission.DENIED, result.permission)
      assertFalse(result.canRequest)
      assertEquals(0, platform.requests)
      assertEquals(0, platform.settings)
    }
  }

  @Test
  fun `S02 explicit settings double tap dispatches once and return only reobserves`() = runTest {
    val platform = PermissionPlatform(AndroidNotificationPermissionSnapshot(36, false, false, true))
    platform.settingsGate = CompletableDeferred()
    val adapter = NotificationPermissionAdapter(platform)
    val first = async { adapter.openSettings() }
    val second = async { adapter.openSettings() }
    runCurrent()
    assertEquals(1, platform.settings)
    platform.state = platform.state.copy(notificationsEnabled = true)
    platform.settingsGate!!.complete(Unit)
    assertTrue(first.await())
    assertTrue(second.await())
    assertEquals(NotificationPermission.ALLOWED, adapter.observe().permission)
    assertEquals(0, platform.requests)
  }

  @Test
  fun `S02 unavailable platform does not prompt or dispatch settings`() = runTest {
    val platform = PermissionPlatform(AndroidNotificationPermissionSnapshot(36, false, true, available = false))
    val adapter = NotificationPermissionAdapter(platform)
    assertEquals(NotificationPermission.UNAVAILABLE, adapter.enable().permission)
    assertFalse(adapter.openSettings())
    assertEquals(0, platform.requests)
    assertEquals(0, platform.settings)
  }

  @Test
  fun `S02 failed native observation stays unavailable without escaping private SDK failure`() {
    val platform = PermissionPlatform()
    platform.snapshotFailure = IllegalStateException("SYNTHETIC_PRIVATE_PROVIDER_DETAIL")
    val result = runCatching { NotificationPermissionAdapter(platform).observe() }
    assertTrue("Native observation failures must return sanitized state", result.isSuccess)
    assertEquals(NotificationPermissionObservation(NotificationPermission.UNAVAILABLE, false), result.getOrThrow())
    assertEquals(0, platform.requests)
    assertEquals(0, platform.settings)
  }

  @Test
  fun `S02 platform failures are sanitized and a later explicit Enable can retry`() = runTest {
    val platform = PermissionPlatform()
    platform.requestFailure = IllegalStateException("SYNTHETIC_PRIVATE_PROVIDER_DETAIL")
    val adapter = NotificationPermissionAdapter(platform)
    val failed = adapter.enable()
    assertEquals(NotificationPermission.UNAVAILABLE, failed.permission)
    assertFalse(failed.toString().contains("SYNTHETIC"))
    platform.requestFailure = null
    platform.afterRequest = platform.state.copy(notificationsEnabled = true)
    assertEquals(NotificationPermission.ALLOWED, adapter.enable().permission)
    assertEquals(2, platform.requests)
    platform.settingsFailure = IllegalStateException("SYNTHETIC_PRIVATE_PROVIDER_DETAIL")
    assertFalse(adapter.openSettings())
  }

  private class PermissionPlatform(
    var state: AndroidNotificationPermissionSnapshot = AndroidNotificationPermissionSnapshot(36, false, true),
  ) : AndroidNotificationPermissionPlatform {
    var requests = 0
    var settings = 0
    val fallbacks = mutableListOf<Boolean>()
    var requestGate: CompletableDeferred<Unit>? = null
    var settingsGate: CompletableDeferred<Unit>? = null
    var afterRequest: AndroidNotificationPermissionSnapshot? = null
    var requestFailure: Exception? = null
    var settingsFailure: Exception? = null
    var snapshotFailure: Exception? = null

    override fun snapshot(): AndroidNotificationPermissionSnapshot {
      snapshotFailure?.let { throw it }
      return state
    }

    override suspend fun requestPermission(fallbackToSettings: Boolean) {
      requests++
      fallbacks.add(fallbackToSettings)
      requestGate?.await()
      requestFailure?.let { throw it }
      afterRequest?.let { state = it }
    }

    override suspend fun openNotificationSettings() {
      settings++
      settingsGate?.await()
      settingsFailure?.let { throw it }
    }
  }
}
