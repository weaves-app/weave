package si.tryweave.auth

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WeaveAuthPackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    if (name == WeaveAuthModule.NAME) WeaveAuthModule(context, AuthDependencies.service) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
      WeaveAuthModule.NAME to
        ReactModuleInfo(
          WeaveAuthModule.NAME,
          WeaveAuthModule.NAME,
          false,
          false,
          false,
          true,
        )
    )
  }
}
