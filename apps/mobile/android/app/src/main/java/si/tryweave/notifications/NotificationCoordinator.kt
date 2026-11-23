package si.tryweave.notifications

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import org.json.JSONTokener
import java.time.Instant
import si.tryweave.auth.AuthorizedNotificationSession
import si.tryweave.auth.NotificationHttpOperation
import si.tryweave.auth.NotificationHttpRequest
import si.tryweave.auth.NotificationHttpResult
import si.tryweave.auth.NotificationSessionContext
import org.json.JSONObject
import si.tryweave.auth.NativeNotificationAuthAuthority
import si.tryweave.auth.SessionAuthorizedTransport

data class NotificationInstallation(val id: String, val tokenPresent: Boolean, val optedIn: Boolean, val externalId: String, val change: Long)

interface NotificationProvider : AndroidNotificationPermissionPlatform {
  val configured: Boolean
  suspend fun initialize(): Boolean
  fun installation(): NotificationInstallation
  fun observe(listener: () -> Unit): () -> Unit
  fun observeJwtInvalidation(listener: (String) -> Unit): () -> Unit
  suspend fun bind(externalId: String, jwt: String)
  suspend fun logout()
  fun optIn()
  fun optOut()
}

interface NotificationClock {
  fun monotonicMilliseconds(): Long
  fun wallMilliseconds(): Long
}

/** Process-owned coordinator; callers dispatch onto one native coroutine dispatcher. */
class NotificationCoordinator(
  private val authority: NativeNotificationAuthAuthority,
  private val transport: SessionAuthorizedTransport,
  private val provider: NotificationProvider,
  private val clock: NotificationClock,
  private val scope: CoroutineScope,
) {
  private val permission = NotificationPermissionAdapter(provider)
  private val sdkWrites = Mutex()
  private val initialization = Mutex()
  @Volatile private var initialized = false
  @Volatile private var lease: String? = null
  @Volatile private var generation = -1L
  @Volatile private var intent: Pair<String, String>? = null
  @Volatile private var authorized: AuthorizedNotificationSession? = null
  @Volatile private var epoch = 0L
  private var revision = 0L
  private var signature: String? = null
  private var setup: Pair<Long, CompletableDeferred<Unit>>? = null
  private var grantAllowedAt = 0L
  @Volatile private var signedEpoch: Long? = null
  private var invalidatedCredentialEpoch: Long? = null
  private var credentialRevision = 0L
  private var greatestAttempt = 0L
  private val listeners = java.util.concurrent.CopyOnWriteArraySet<(JSONObject) -> Unit>()

  private fun launchSafely(action: suspend () -> Unit) {
    scope.launch {
      try { action() } catch (cancelled: CancellationException) { throw cancelled }
      catch (_: Exception) { /* SDK errors never reach process exception logging. */ }
    }
  }

  fun start() { launchSafely { initialize() } }

  fun observe(listener: (JSONObject) -> Unit): () -> Unit {
    listeners.add(listener)
    return { listeners.remove(listener) }
  }

  private suspend fun initialize() = initialization.withLock {
    if (initialized || !provider.configured) return@withLock
    if (!withTimeout(5000) { provider.initialize() }) return@withLock
    initialized = true
    provider.observe { launchSafely { publish() } }
    provider.observeJwtInvalidation { externalId ->
      launchSafely {
        if (intent?.second == externalId && current() && invalidatedCredentialEpoch != epoch) {
          invalidatedCredentialEpoch = epoch
          credentialRevision++
          signedEpoch = null
          signature = null
          revision++
          publish()
          bindCurrent(epoch, force = true)
        }
      }
    }
    authority.observeInvalidation {
      // Immediate suppression precedes any suspended SDK cleanup or JS notification.
      authorized = null
      epoch++
      launchSafely { suspendIdentity(); publish() }
    }
    if (authority.capture() == null && provider.installation().externalId.isNotEmpty()) suspendIdentity()
  }

  suspend fun execute(command: String, payload: String): JSONObject {
    val request = parse(command, payload) ?: return error("invalid-request", "", 0)
    val requestLease = request.getString("rootLease")
    val requestGeneration = number(request, "generation")!!
    try {
      if (command == "acquire") {
        if (lease != requestLease) {
          lease = requestLease; generation = -1; intent = null; authorized = null; greatestAttempt = 0
          epoch++; signature = null
        }
        initialize()
        return observation()
      }
      if (command == "release") {
        if (lease == requestLease) {
          lease = null; intent = null; authorized = null; epoch++
        }
        return error("stale", requestLease, requestGeneration)
      }
      if (lease != requestLease) return error("stale", requestLease, requestGeneration)
      val identity = if (request.has("sessionId")) request.getString("sessionId") to request.getString("accountId") else null
      if (command == "reconcile") {
        if (requestGeneration < generation || (requestGeneration == generation && identity != intent)) return error("stale")
        if (requestGeneration > generation) {
          generation = requestGeneration; intent = identity; authorized = null
          epoch++; signature = null
          val actual = authority.capture()
          if (actual?.sessionId == identity?.first && actual?.accountId == identity?.second) authorized = actual
        }
        if (identity == null || !current()) {
          authorized = null
          launchSafely { suspendIdentity(); publish() }
          return observation()
        }
        // Retire the previous account before network work for its replacement can suspend.
        suspendIdentity()
        bindCurrent(epoch)
        return observation()
      }
      if (requestGeneration != generation || identity != intent || !current()) return error("stale")
      return when (command) {
        "enable" -> {
          val captured = epoch
          val result = permission.enable()
          if (!current(captured)) error("stale") else {
            if (result.permission == NotificationPermission.ALLOWED) sdkWrites.withLock {
              if (current(captured)) provider.optIn()
            }
            bindCurrent(captured)
            observation()
          }
        }
        "openSettings" -> {
          val captured = epoch
          permission.openSettings()
          if (current(captured)) observation() else error("stale")
        }
        "refresh" -> readiness(request)
        else -> error("invalid-request")
      }
    } catch (cancelled: CancellationException) {
      // Cancellation is never serialized with diagnostics or credentials.
      return error("unavailable", requestLease, requestGeneration)
    } catch (_: Exception) {
      return error("unavailable", requestLease, requestGeneration)
    }
  }

  private fun current(capturedEpoch: Long = epoch): Boolean = lease != null && capturedEpoch == epoch &&
    intent != null && authorized != null && authority.capture() == authorized

  private suspend fun suspendIdentity() {
    sdkWrites.withLock {
      if (initialized && provider.installation().externalId.isNotEmpty() &&
        (!current() || provider.installation().externalId != intent?.second)) provider.logout()
    }
  }

  private suspend fun bindCurrent(capturedEpoch: Long, force: Boolean = false) {
    if (!initialized || !current(capturedEpoch) || permission.observe().permission != NotificationPermission.ALLOWED) return
    val account = intent!!.second
    if (!force && signedEpoch == capturedEpoch && provider.installation().externalId == account) return
    val existing = setup
    if (existing?.first == capturedEpoch) { existing.second.await(); return }
    if (clock.monotonicMilliseconds() < grantAllowedAt) return
    val done = CompletableDeferred<Unit>()
    setup = capturedEpoch to done
    grantAllowedAt = clock.monotonicMilliseconds() + 5000
    try {
      val capturedCredentialRevision = credentialRevision
      val context = NotificationSessionContext(intent!!.first, account, generation)
      val result = transport.execute(context, NotificationHttpRequest(NotificationHttpOperation.IDENTITY_GRANT))
      if (!current(capturedEpoch) || result !is NotificationHttpResult.Response || result.status != 200) return
      val grant = responseObject(result.body) ?: return
      if (grant.keys().asSequence().toSet() != setOf("externalId", "token", "expiresAt") || grant.opt("externalId") != account || grant.opt("token") !is String || grant.getString("token").isBlank() || grant.opt("expiresAt") !is String) return
      val remaining = Instant.parse(grant.getString("expiresAt")).toEpochMilli() - clock.wallMilliseconds()
      if (remaining !in 15000..300000) return
      sdkWrites.withLock {
        if (!current(capturedEpoch)) return@withLock
        if (provider.installation().externalId.isNotEmpty() && provider.installation().externalId != account) provider.logout()
        if (current(capturedEpoch)) provider.bind(account, grant.getString("token"))
        if (!current(capturedEpoch)) provider.logout()
        else if (credentialRevision == capturedCredentialRevision) {
          signedEpoch = capturedEpoch
          invalidatedCredentialEpoch = null
        }
      }
      publish()
    } catch (_: Exception) {
      // A failed setup is retried only by a new allowed trigger.
    } finally {
      done.complete(Unit)
      if (setup?.second === done) setup = null
    }
  }

  private fun observation(): JSONObject {
    val observed = if (initialized) permission.observe() else NotificationPermissionObservation(NotificationPermission.UNAVAILABLE, false)
    val installation = if (initialized) provider.installation() else NotificationInstallation("", false, false, "", 0)
    val next = listOf(observed, installation, current(), signedEpoch == epoch).joinToString()
    if (next != signature) { signature = next; revision++ }
    return envelope("observation").put("revision", revision)
      .put("permission", observed.permission.name.lowercase()).put("canRequest", observed.canRequest)
      .put("registrationPresent", installation.id.isNotBlank() && installation.tokenPresent)
      .put("enabled", installation.optedIn && current())
      .put("matchesCurrentAccount", current() && signedEpoch == epoch && installation.externalId == intent?.second)
  }

  private fun publish() {
    if (lease == null) return
    val event = observation()
    listeners.toList().forEach { try { it(JSONObject(event.toString())) } catch (_: Exception) {} }
  }

  fun shouldDisplay(): Boolean = try {
    val captured = epoch
    initialized && current(captured) && signedEpoch == captured && permission.observe().permission == NotificationPermission.ALLOWED &&
      provider.installation().let { it.optedIn && it.externalId == intent?.second } && current(captured)
  } catch (_: Exception) { false }

  private suspend fun readiness(request: JSONObject): JSONObject {
    val before = observation()
    val requestedRevision = number(request, "revision")!!
    val attempt = request.getString("attemptId")
    if (requestedRevision != revision || attempt.toLong() <= greatestAttempt) return error("stale")
    greatestAttempt = attempt.toLong()
    val capturedEpoch = epoch
    val started = clock.monotonicMilliseconds()
    fun result(status: String, remaining: Long = 0, retry: Int? = null): JSONObject {
      val value = envelope("readiness").put("revision", requestedRevision).put("attemptId", attempt)
        .put("status", status).put("remainingValidityMs", remaining)
      if (retry != null) value.put("retryAfterSeconds", retry.coerceIn(1, 60))
      return value
    }
    if (!shouldDisplay() || !before.getBoolean("registrationPresent")) return result("pending")
    val installation = provider.installation()
    val response = transport.execute(NotificationSessionContext(intent!!.first, intent!!.second, generation),
      NotificationHttpRequest(NotificationHttpOperation.READINESS, installation.id, "android"))
    observation()
    if (!current(capturedEpoch) || revision != requestedRevision) return error("stale")
    if (response !is NotificationHttpResult.Response) return result("unavailable")
    if (response.status != 200) {
      val retry = try { number(JSONObject(response.body), "retryAfterSeconds")?.toInt()?.coerceIn(1, 60) } catch (_: Exception) { null }
      return result(when (response.status) { 401 -> "unauthorized"; 429 -> "rate-limited"; else -> "unavailable" }, retry = retry)
    }
    val body = responseObject(response.body) ?: return result("unavailable")
    if (body.keys().asSequence().toSet() != setOf("status", "checkedAt", "validForSeconds") || body.opt("checkedAt") !is String) return result("unavailable")
    try { Instant.parse(body.getString("checkedAt")) } catch (_: Exception) { return result("unavailable") }
    val status = body.opt("status")
    val seconds = number(body, "validForSeconds")
    if (status == "pending" && seconds == 0L) return result("pending")
    if (status != "ready" || seconds != 60L) return result("unavailable")
    val remaining = (60000 - (clock.monotonicMilliseconds() - started)).coerceIn(0, 60000)
    return if (remaining > 0) result("ready", remaining) else result("pending")
  }

  private fun envelope(kind: String) = JSONObject().put("version", 1).put("kind", kind)
    .put("rootLease", lease.orEmpty()).put("generation", generation.coerceAtLeast(0))

  private fun error(code: String, root: String = lease.orEmpty(), gen: Long = generation.coerceAtLeast(0)) =
    JSONObject().put("version", 1).put("kind", "error").put("rootLease", root).put("generation", gen).put("code", code)

  private fun parse(command: String, text: String): JSONObject? = try {
    if (text.toByteArray(Charsets.UTF_8).size > 4096) null else {
      val tokenizer = JSONTokener(text)
      val value = tokenizer.nextValue() as? JSONObject
      val commands = setOf("acquire", "release", "reconcile", "enable", "refresh", "openSettings")
      if (value == null || tokenizer.nextClean() != '\u0000' || command !in commands || number(value, "version") != 1L || !string(value, "rootLease", 128) || number(value, "generation") == null) null else {
        val keys = mutableSetOf("version", "rootLease", "generation")
        val binding = command !in setOf("acquire", "release")
        if (binding) keys.addAll(listOf("sessionId", "accountId"))
        if (command == "refresh") keys.addAll(listOf("revision", "attemptId"))
        val pair = string(value, "sessionId", 256) && string(value, "accountId", 256)
        val absent = !value.has("sessionId") && !value.has("accountId")
        when {
          !keys.containsAll(value.keys().asSequence().toSet()) -> null
          !binding && number(value, "generation") != 0L -> null
          binding && !pair && !(command == "reconcile" && absent) -> null
          command == "refresh" && (number(value, "revision") == null || attemptSequence(value) == null) -> null
          else -> value
        }
      }
    }
  } catch (_: Exception) { null }

  private fun responseObject(text: String): JSONObject? = try {
    if (text.toByteArray(Charsets.UTF_8).size > 16384) null else {
      val tokenizer = JSONTokener(text)
      val value = tokenizer.nextValue() as? JSONObject
      value?.takeIf { tokenizer.nextClean() == '\u0000' }
    }
  } catch (_: Exception) { null }

  private fun attemptSequence(value: JSONObject): Long? {
    val text = value.opt("attemptId") as? String ?: return null
    if (!text.matches(Regex("[1-9][0-9]{0,15}"))) return null
    return text.toLongOrNull()?.takeIf { it <= 9007199254740991L }
  }

  private fun string(value: JSONObject, key: String, max: Int): Boolean = (value.opt(key) as? String)?.let { it.isNotBlank() && it.length <= max } == true
  private fun number(value: JSONObject, key: String): Long? {
    val n = value.opt(key) as? Number ?: return null
    val d = n.toDouble()
    return if (d.isFinite() && d >= 0 && d <= 9007199254740991.0 && d == n.toLong().toDouble()) n.toLong() else null
  }
}
