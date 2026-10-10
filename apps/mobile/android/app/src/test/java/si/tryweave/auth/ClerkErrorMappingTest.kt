package si.tryweave.auth

import com.clerk.api.network.model.error.ClerkErrorResponse
import com.clerk.api.network.model.error.Error
import com.clerk.api.network.serialization.ClerkResult
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ClerkErrorMappingTest {
  @Test
  fun `S16 provider Retry-After header is preserved without reading raw diagnostic body`() {
    val response =
      Response.Builder()
        .request(Request.Builder().url("https://provider.example.test").build())
        .protocol(Protocol.HTTP_1_1)
        .code(429)
        .message("SYNTHETIC_SECRET")
        .header("Retry-After", "11")
        .build()
    val failure =
      ClerkResult.Failure(
        ClerkErrorResponse(listOf(Error(code = "too_many_requests", message = "SYNTHETIC_SECRET"))),
        code = 429,
        tags = mapOf(Response::class to response),
      )
    val safe = NativeClerkSdk.mapFailure(failure)
    assertEquals("rateLimited", safe.code)
    assertEquals(11, safe.retryAfterSeconds)
    assertFalse(safe.toString().contains("SYNTHETIC_SECRET"))
  }

  @Test
  fun `FR012 malformed provider retry metadata cannot throw or expose raw secret`() {
    val failure =
      ClerkResult.apiFailure(
        ClerkErrorResponse(
          listOf(Error(code = "form_code_incorrect", message = "SYNTHETIC_SECRET")),
          meta =
            JsonObject(
              mapOf("retry_after" to JsonArray(listOf(JsonPrimitive("SYNTHETIC_SECRET"))))
            ),
        )
      )
    val safe = NativeClerkSdk.mapFailure(failure)
    assertEquals("codeInvalid", safe.code)
    assertEquals(null, safe.retryAfterSeconds)
    assertFalse(safe.toString().contains("SYNTHETIC_SECRET"))
  }

  @Test
  fun `S03 S16 S18 concrete Clerk codes map to app-owned existing credential and verification errors`() {
    for ((provider, expected) in
      mapOf(
        "form_identifier_not_found" to "existingAccountRequired",
        "external_account_not_found" to "existingAccountRequired",
        "form_password_incorrect" to "rejectedCredentials",
        "verification_expired" to "codeExpired",
        "form_code_incorrect" to "codeInvalid",
      )) {
      val safe =
        NativeClerkSdk.mapFailure(
          ClerkResult.apiFailure(
            ClerkErrorResponse(
              listOf(
                Error(
                  code = provider,
                  message = "SYNTHETIC_SECRET",
                  longMessage = "SYNTHETIC_TOKEN",
                )
              )
            )
          )
        )
      assertEquals(expected, safe.code)
      assertFalse(safe.toString().contains("SYNTHETIC"))
    }
  }
}
