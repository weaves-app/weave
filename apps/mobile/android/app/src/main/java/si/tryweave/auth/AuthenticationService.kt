package si.tryweave.auth

import org.json.JSONObject

/** Consumer-owned native seam. SDK objects and credentials never cross this interface. */
interface AuthenticationService {
  suspend fun execute(command: String, payload: JSONObject): JSONObject

  fun observe(listener: (JSONObject) -> Unit): () -> Unit

  fun release() {}
}

/** T008 fail-closed shell; production behavior follows native contract RED. */
class UnavailableAuthenticationService : AuthenticationService {
  override suspend fun execute(command: String, payload: JSONObject): JSONObject =
    JSONObject()
      .put("status", "unavailable")
      .put("generation", payload.optLong("generation"))
      .put("revision", 0)
      .put("validatedAt", JSONObject.NULL)

  override fun observe(listener: (JSONObject) -> Unit): () -> Unit = {}
}
