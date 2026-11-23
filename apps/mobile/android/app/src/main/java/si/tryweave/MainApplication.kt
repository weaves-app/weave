package si.tryweave

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(si.tryweave.auth.WeaveAuthPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    si.tryweave.auth.AuthBootstrap.initialize(BuildConfig.CLERK_PUBLISHABLE_KEY) { publicKey ->
      com.clerk.api.Clerk.initialize(
        this,
        publicKey,
        com.clerk.api.ClerkConfigurationOptions(enableDebugMode = false, telemetryEnabled = false),
      )
    }
    loadReactNative(this)
  }
}
