package si.tryweave.notifications

import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import si.tryweave.auth.*

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationCoordinatorTest {
  @Test fun `S03 signed binding needs native authority and grant with matching current account`() = runTest {
    val fixture = CoordinatorFixture(this)
    val events = mutableListOf<JSONObject>()
    fixture.coordinator.observe { events.add(it) }
    fixture.acquire()
    val result = fixture.reconcile()
    assertEquals("observation", result.getString("kind"))
    assertEquals(listOf("account-a" to "SYNTHETIC_ONE_SIGNAL_JWT"), fixture.provider.bindings)
    assertTrue(result.getBoolean("matchesCurrentAccount"))
    assertFalse((events + result).joinToString().contains("SYNTHETIC"))
    assertFalse(result.has("accountId"))
    assertFalse(result.has("subscriptionId"))
    assertEquals(0, fixture.provider.prompts)
  }

  @Test fun `S04 signed out higher generation fences delayed grant and older reconcile`() = runTest {
    val f = CoordinatorFixture(this); f.acquire()
    f.transport.held = CompletableDeferred()
    val old = async { f.reconcile() }; runCurrent()
    val signedOut = f.coordinator.execute("reconcile", wire(generation = 2).toString())
    assertFalse(signedOut.getBoolean("matchesCurrentAccount"))
    f.transport.held!!.complete(f.transport.grant())
    old.await(); runCurrent()
    assertTrue(f.provider.bindings.isEmpty())
    assertEquals("stale", f.reconcile().getString("code"))
    assertFalse(f.coordinator.shouldDisplay())
  }

  @Test fun `S09 new lease survives stale release with singleton provider observers`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile()
    f.coordinator.execute("acquire", wire("root-b", 0).toString())
    f.coordinator.execute("release", wire("root-a", 0).toString())
    val result = f.coordinator.execute("reconcile", identity("root-b", 1).toString())
    assertEquals("root-b", result.getString("rootLease"))
    assertEquals(1, f.provider.initializations)
    assertEquals(1, f.provider.observers.size)
    assertEquals(1, f.provider.jwtObservers.size)
  }

  @Test fun `S11 exact readiness echoes attempt and deducts elapsed native request duration`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); val observation = f.reconcile()
    f.transport.held = CompletableDeferred()
    val pending = async { f.refresh(observation.getLong("revision"), "1") }; runCurrent()
    f.clock.monotonic += 1200
    f.transport.held!!.complete(NotificationHttpResult.Response(200, "{\"status\":\"ready\",\"checkedAt\":\"2026-01-01T00:00:00Z\",\"validForSeconds\":60}"))
    val proof = pending.await()
    assertEquals("ready", proof.getString("status"))
    assertEquals(58800L, proof.getLong("remainingValidityMs"))
    assertEquals("1", proof.getString("attemptId"))
    assertEquals("stale", f.refresh(observation.getLong("revision"), "1").getString("code"))
  }

  @Test fun `S04 native invalidation clears eligibility during JS suspension and stale HTTP response`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); val observation = f.reconcile()
    f.transport.held = CompletableDeferred()
    val pending = async { f.refresh(observation.getLong("revision"), "1") }; runCurrent()
    f.auth.invalidate()
    assertFalse(f.coordinator.shouldDisplay())
    f.transport.held!!.complete(NotificationHttpResult.Response(200, "{\"status\":\"ready\",\"checkedAt\":\"2026-01-01T00:00:00Z\",\"validForSeconds\":60}"))
    assertEquals("stale", pending.await().getString("code"))
    runCurrent()
    assertTrue(f.provider.logouts > 0)
    assertEquals(0, f.provider.optOuts)
  }

  @Test fun `S11 short mismatched malformed grants never bind or refresh tokens in a loop`() = runTest {
    for (body in listOf("{}", "{\"externalId\":\"wrong\",\"token\":\"SYNTHETIC\",\"expiresAt\":\"2099-01-01T00:00:00Z\"}")) {
      val f = CoordinatorFixture(this); f.transport.response = NotificationHttpResult.Response(200, body); f.acquire(); f.reconcile()
      assertTrue(f.provider.bindings.isEmpty())
      assertEquals(1, f.transport.calls.size)
    }
    val f = CoordinatorFixture(this); f.transport.response = f.transport.grant(14); f.acquire(); f.reconcile()
    assertTrue(f.provider.bindings.isEmpty()); assertEquals(1, f.transport.calls.size)
  }

  @Test fun `S09 JWT invalidation ignores other account and coalesces current account callbacks`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile()
    assertEquals(1, f.provider.jwtObservers.size)
    f.clock.monotonic += 5001
    f.provider.jwtObservers.single().invoke("old-account"); runCurrent()
    assertEquals(1, f.transport.calls.size)
    f.transport.held = CompletableDeferred()
    repeat(3) { f.provider.jwtObservers.single().invoke("account-a") }; runCurrent()
    assertEquals(2, f.transport.calls.size)
    f.transport.held!!.complete(NotificationHttpResult.Unavailable); runCurrent()
    assertEquals(2, f.transport.calls.size)
  }

  @Test fun `S01 only explicit enable opts in and prompts while refresh and reconcile remain silent`() = runTest {
    val f = CoordinatorFixture(this); f.provider.permission = f.provider.permission.copy(notificationsEnabled = false, canRequestPermission = true)
    f.acquire(); f.reconcile()
    assertEquals(0, f.provider.prompts); assertEquals(0, f.provider.optIns)
    val enabled = f.coordinator.execute("enable", identity().toString())
    assertEquals(1, f.provider.prompts); assertEquals(1, f.provider.optIns)
    assertEquals("allowed", enabled.getString("permission"))
    f.coordinator.execute("openSettings", identity().toString())
    assertEquals(1, f.provider.settings); assertEquals(1, f.provider.prompts)
  }

  @Test fun `S10 strict wire rejects unknown commands keys identities unsafe counters oversized and trailing JSON`() = runTest {
    val f = CoordinatorFixture(this); f.acquire()
    val invalid = listOf(
      "navigate" to identity().toString(),
      "reconcile" to identity().put("url", "https://evil.example").toString(),
      "reconcile" to wire().put("sessionId", "session-a").toString(),
      "reconcile" to wire().put("generation", 9007199254740992L).toString(),
      "reconcile" to wire().put("version", "1").toString(),
      "reconcile" to identity().toString().plus(" {}"),
      "reconcile" to " ".repeat(4097),
    )
    for ((command, payload) in invalid) {
      val result = f.coordinator.execute(command, payload)
      assertEquals("invalid-request", result.getString("code"))
      assertEquals(setOf("version", "kind", "rootLease", "generation", "code"), result.keys().asSequence().toSet())
    }
  }

  @Test fun `S08 missing configuration never initializes provider or breaks safe response`() = runTest {
    val f = CoordinatorFixture(this); f.provider.configured = false
    val result = f.acquire()
    assertEquals("unavailable", result.getString("permission"))
    assertEquals(0, f.provider.initializations)
  }

  @Test fun `S09 invalidation during cooldown remains pending until explicit retry signs again`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile()
    f.provider.jwtObservers.single().invoke("account-a"); runCurrent()
    assertFalse(f.coordinator.shouldDisplay())
    assertEquals(1, f.transport.calls.size)
    f.clock.monotonic += 5001
    f.reconcile()
    assertEquals(2, f.provider.bindings.size)
    assertTrue(f.coordinator.shouldDisplay())
  }

  @Test fun `S03 restored same account identity still requires a current signed grant`() = runTest {
    val f = CoordinatorFixture(this)
    f.provider.state = f.provider.state.copy(externalId = "account-a")
    f.acquire(); f.reconcile()
    assertEquals(1, f.provider.bindings.size)
    assertEquals(0, f.provider.optOuts)
  }

  @Test fun `S09 process startup initializes once and suspends restored identity before a JS lease`() = runTest {
    val f = CoordinatorFixture(this)
    f.auth.invalidate()
    f.provider.state = f.provider.state.copy(externalId = "old-account")
    repeat(3) { f.coordinator.start() }; runCurrent()
    assertEquals(1, f.provider.initializations)
    assertEquals("", f.provider.state.externalId)
    assertEquals(0, f.provider.optOuts)
    assertFalse(f.coordinator.shouldDisplay())
    f.acquire()
    assertEquals(1, f.provider.initializations)
  }

  @Test fun `S04 changing account retires old installed identity before awaiting next grant`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile()
    f.auth.current = AuthorizedNotificationSession("session-b", "account-b", 2)
    f.clock.monotonic += 5001
    f.transport.held = CompletableDeferred()
    val request = identity(generation = 2).put("sessionId", "session-b").put("accountId", "account-b")
    val switching = async { f.coordinator.execute("reconcile", request.toString()) }; runCurrent()
    assertEquals("", f.provider.state.externalId)
    assertEquals(1, f.provider.logouts)
    assertEquals(0, f.provider.optOuts)
    f.transport.held!!.complete(NotificationHttpResult.Unavailable); switching.await()
    assertEquals("", f.provider.state.externalId)
  }

  @Test fun `S11 long lived lease allows over 128 attempts and rejects replay across generations`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); var observed = f.reconcile()
    for (attempt in 1..140) {
      assertEquals("readiness", f.refresh(observed.getLong("revision"), attempt.toString()).getString("kind"))
    }
    f.clock.monotonic += 5001
    observed = f.coordinator.execute("reconcile", identity(generation = 2).toString())
    val repeated = identity(generation = 2).put("revision", observed.getLong("revision")).put("attemptId", "1")
    assertEquals("stale", f.coordinator.execute("refresh", repeated.toString()).getString("code"))
    for (bad in listOf("0", "01", "1.0", "1e2", "9007199254740992", "attempt")) {
      assertEquals("invalid-request", f.coordinator.execute("refresh", repeated.put("attemptId", bad).toString()).getString("code"))
    }
  }

  @Test fun `S09 failed JWT renewal is not retried by duplicate observer events after cooldown`() = runTest {
    val f = CoordinatorFixture(this); f.acquire(); f.reconcile(); f.clock.monotonic += 5001
    f.transport.response = NotificationHttpResult.Unavailable
    f.provider.jwtObservers.single().invoke("account-a"); runCurrent()
    assertEquals(2, f.transport.calls.size)
    f.clock.monotonic += 5001
    f.provider.jwtObservers.single().invoke("account-a"); runCurrent()
    assertEquals(2, f.transport.calls.size)
    f.transport.response = null
    f.reconcile()
    assertEquals(3, f.transport.calls.size)
    assertTrue(f.coordinator.shouldDisplay())
  }

  companion object {
    fun wire(lease: String = "root-a", generation: Long = 1) = JSONObject().put("version", 1).put("rootLease", lease).put("generation", generation)
    fun identity(lease: String = "root-a", generation: Long = 1) = wire(lease, generation).put("sessionId", "session-a").put("accountId", "account-a")
  }
}

class CoordinatorFixture(scope: kotlinx.coroutines.CoroutineScope) {
  val auth = TestNotificationAuthority()
  val clock = TestNotificationClock()
  val provider = TestNotificationProvider()
  val transport = TestNotificationTransport(clock)
  val coordinator = NotificationCoordinator(auth, transport, provider, clock, scope)
  suspend fun acquire() = coordinator.execute("acquire", NotificationCoordinatorTest.wire(generation = 0).toString())
  suspend fun reconcile() = coordinator.execute("reconcile", NotificationCoordinatorTest.identity().toString())
  suspend fun refresh(revision: Long, attempt: String) = coordinator.execute("refresh", NotificationCoordinatorTest.identity().put("revision", revision).put("attemptId", attempt).toString())
}

class TestNotificationClock : NotificationClock {
  var monotonic = 900000L
  override fun monotonicMilliseconds() = monotonic
  override fun wallMilliseconds() = 1800000000000L
}

class TestNotificationTransport(private val clock: NotificationClock) : SessionAuthorizedTransport {
  val calls = mutableListOf<NotificationHttpOperation>()
  var held: CompletableDeferred<NotificationHttpResult>? = null
  var response: NotificationHttpResult? = null
  fun grant(seconds: Long = 300): NotificationHttpResult = NotificationHttpResult.Response(200, JSONObject().put("externalId", "account-a").put("token", "SYNTHETIC_ONE_SIGNAL_JWT").put("expiresAt", Instant.ofEpochMilli(clock.wallMilliseconds() + seconds * 1000).toString()).toString())
  override suspend fun execute(context: NotificationSessionContext, request: NotificationHttpRequest): NotificationHttpResult {
    calls.add(request.operation)
    return held?.await() ?: response ?: if (request.operation == NotificationHttpOperation.IDENTITY_GRANT) grant() else NotificationHttpResult.Response(200, "{\"status\":\"pending\",\"checkedAt\":\"2026-01-01T00:00:00Z\",\"validForSeconds\":0}")
  }
}

class TestNotificationProvider : NotificationProvider {
  override var configured = true
  var permission = AndroidNotificationPermissionSnapshot(36, true, false)
  var state = NotificationInstallation("01234567-89ab-cdef-0123-456789abcdef", true, true, "", 0)
  var logouts = 0; var initializations = 0; var prompts = 0; var settings = 0; var optIns = 0; var optOuts = 0
  var logoutFailure: Exception? = null
  var bindGate: CompletableDeferred<Unit>? = null
  val bindings = mutableListOf<Pair<String, String>>()
  val observers = mutableSetOf<() -> Unit>(); val jwtObservers = mutableSetOf<(String) -> Unit>()
  override suspend fun initialize(): Boolean { initializations++; return true }
  override fun snapshot() = permission
  override fun installation() = state
  override fun observe(listener: () -> Unit): () -> Unit { observers.add(listener); return { observers.remove(listener) } }
  override fun observeJwtInvalidation(listener: (String) -> Unit): () -> Unit { jwtObservers.add(listener); return { jwtObservers.remove(listener) } }
  override suspend fun bind(externalId: String, jwt: String) { bindGate?.await(); bindings.add(externalId to jwt); state = state.copy(externalId = externalId) }
  override suspend fun logout() { logoutFailure?.let { throw it }; logouts++; state = state.copy(externalId = "") }
  override fun optIn() { optIns++; state = state.copy(optedIn = true) }
  override fun optOut() { optOuts++; state = state.copy(optedIn = false) }
  override suspend fun requestPermission(fallbackToSettings: Boolean) { prompts++; permission = permission.copy(notificationsEnabled = true, canRequestPermission = false) }
  override suspend fun openNotificationSettings() { settings++ }
}
