package si.tryweave.notifications

import com.onesignal.notifications.INotificationWillDisplayEvent
import org.junit.Test
import org.mockito.Mockito.*

class NotificationPresentationTest {
  @Test fun `S05 eligible foreground delivery uses SDK default exactly once without manual display`() {
    val event = mock(INotificationWillDisplayEvent::class.java)
    NotificationPresentationAdapter { true }.onWillDisplay(event)
    verifyNoInteractions(event)
  }

  @Test fun `S05 signed out unknown or failed native authority suppresses foreground without reading payload`() {
    for (eligible in listOf<() -> Boolean>({ false }, { throw IllegalStateException("SYNTHETIC_SECRET") })) {
      val event = mock(INotificationWillDisplayEvent::class.java)
      NotificationPresentationAdapter(eligible).onWillDisplay(event)
      verify(event).preventDefault()
      verifyNoMoreInteractions(event)
    }
  }
}
