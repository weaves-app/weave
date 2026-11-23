package si.tryweave.auth

import com.clerk.api.log.ClerkLog
import java.io.ByteArrayOutputStream
import java.io.PrintStream
import org.junit.Assert.assertEquals
import org.junit.Test

class ClerkPrivacyTest {
  @Test
  fun `FR012 provider errors never reach stdout at any severity`() {
    val original = System.out
    val captured = ByteArrayOutputStream()
    System.setOut(PrintStream(captured))
    try {
      val secret = "SYNTHETIC_PASSWORD_TOKEN_CODE_MARKER"
      ClerkLog.e(secret)
      ClerkLog.w(secret)
      ClerkLog.i(secret)
      ClerkLog.d(secret)
      ClerkLog.v(secret)
      assertEquals("SDK diagnostics must suppress provider-owned values", "", captured.toString())
    } finally {
      System.setOut(original)
    }
  }
}
