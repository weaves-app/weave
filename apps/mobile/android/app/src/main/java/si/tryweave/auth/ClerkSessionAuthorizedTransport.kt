package si.tryweave.auth

import java.io.InputStream
import java.io.ByteArrayOutputStream
import java.net.URI
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import kotlin.coroutines.resume

data class AuthorizedNotificationSession(val sessionId: String, val accountId: String, val epoch: Long)

interface NativeNotificationAuthAuthority {
  fun capture(): AuthorizedNotificationSession?
  suspend fun token(session: AuthorizedNotificationSession): String?
  fun observeInvalidation(listener: () -> Unit): () -> Unit
}

interface NotificationHttpClient {
  suspend fun post(path: String, token: String, body: String): NotificationHttpResult
}

class ClerkSessionAuthorizedTransport(
  private val authority: NativeNotificationAuthAuthority,
  private val http: NotificationHttpClient,
) : SessionAuthorizedTransport {
  override suspend fun execute(context: NotificationSessionContext, request: NotificationHttpRequest): NotificationHttpResult {
    try {
      val captured = authority.capture() ?: return NotificationHttpResult.Stale
      if (captured.sessionId != context.sessionId || captured.accountId != context.accountId) return NotificationHttpResult.Stale
      val token = withTimeout(5000) { authority.token(captured) }
      if (authority.capture() != captured) return NotificationHttpResult.Stale
      if (token.isNullOrBlank()) return NotificationHttpResult.Unavailable
      val path = when (request.operation) {
        NotificationHttpOperation.IDENTITY_GRANT -> "/api/notifications/identity-grant"
        NotificationHttpOperation.READINESS -> "/api/notifications/readiness"
      }
      val body = if (request.operation == NotificationHttpOperation.IDENTITY_GRANT) "{}" else {
        val id = request.subscriptionId ?: return NotificationHttpResult.Unavailable
        if (!id.matches(Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) || request.platform != "android") return NotificationHttpResult.Unavailable
        JSONObject().put("subscriptionId", id).put("platform", "android").toString()
      }
      val result = withTimeout(5000) { http.post(path, token, body) }
      return if (authority.capture() == captured) result else NotificationHttpResult.Stale
    } catch (_: TimeoutCancellationException) {
      return NotificationHttpResult.Unavailable
    } catch (cancelled: CancellationException) {
      throw cancelled
    } catch (_: Exception) {
      return NotificationHttpResult.Unavailable
    }
  }
}

class BoundedNotificationHttpClient(private val origin: String) : NotificationHttpClient {
  private val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
    .callTimeout(5, TimeUnit.SECONDS).connectTimeout(5, TimeUnit.SECONDS).readTimeout(5, TimeUnit.SECONDS).build()

  override suspend fun post(path: String, token: String, body: String): NotificationHttpResult {
    if (!validOrigin(origin) || path !in setOf("/api/notifications/identity-grant", "/api/notifications/readiness")) return NotificationHttpResult.Unavailable
    val request = Request.Builder().url(origin.trimEnd('/') + path)
      .header("Authorization", "Bearer $token").header("Accept", "application/json")
      .post(body.toRequestBody("application/json".toMediaType())).build()
    return suspendCancellableCoroutine { continuation ->
      val call = client.newCall(request)
      continuation.invokeOnCancellation { call.cancel() }
      call.enqueue(object : Callback {
        override fun onFailure(call: Call, e: java.io.IOException) {
          if (continuation.isActive) continuation.resume(NotificationHttpResult.Unavailable)
        }
        override fun onResponse(call: Call, response: Response) {
          val result = try { response.use { read(it.code, it.body.byteStream()) } } catch (_: Exception) { NotificationHttpResult.Unavailable }
          if (continuation.isActive) continuation.resume(result)
        }
      })
    }
  }

  companion object {
    fun read(status: Int, input: InputStream): NotificationHttpResult {
      if (status in 300..399) return NotificationHttpResult.Unavailable
      val output = ByteArrayOutputStream()
      val buffer = ByteArray(1024)
      while (true) {
        val count = input.read(buffer, 0, minOf(buffer.size, 16385 - output.size()))
        if (count < 0) break
        output.write(buffer, 0, count)
        if (output.size() > 16384) return NotificationHttpResult.Unavailable
      }
      return NotificationHttpResult.Response(status, output.toString(Charsets.UTF_8.name()))
    }
    fun validOrigin(value: String): Boolean = try {
      val uri = URI(value)
      uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null && (uri.path.isNullOrEmpty() || uri.path == "/")
    } catch (_: Exception) { false }
  }
}
