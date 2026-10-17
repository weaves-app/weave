package si.tryweave.notifications

import android.app.Application
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WeaveNotificationsPackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    if (name == WeaveNotificationsModule.NAME) WeaveNotificationsModule(context,
      NotificationDependencies.initialize(context.applicationContext as Application)) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(WeaveNotificationsModule.NAME to ReactModuleInfo(WeaveNotificationsModule.NAME,
      WeaveNotificationsModule.NAME, false, false, false, true))
  }
}
