package si.tryweave.notifications

class NotificationTestClock(var time: Long = 900000L) {
  fun advance(milliseconds: Long) { time += milliseconds }
}
