package __PACKAGE__

import android.app.Activity
import android.os.Build
import android.view.WindowInsets
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@TauriPlugin
class SafeAreaPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun getSafeAreaInsets(invoke: Invoke) {
        val result = JSObject()

        activity.runOnUiThread {
            try {
                val rootView = activity.window.decorView
                val density = activity.resources.displayMetrics.density

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val insets = rootView.rootWindowInsets?.getInsets(
                        WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
                    )
                    if (insets != null) {
                        result.put("top", (insets.top / density).toDouble())
                        result.put("bottom", (insets.bottom / density).toDouble())
                        result.put("left", (insets.left / density).toDouble())
                        result.put("right", (insets.right / density).toDouble())
                        invoke.resolve(result)
                        return@runOnUiThread
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    @Suppress("DEPRECATION")
                    val insets = rootView.rootWindowInsets
                    if (insets != null) {
                        @Suppress("DEPRECATION")
                        result.put("top", (insets.systemWindowInsetTop / density).toDouble())
                        @Suppress("DEPRECATION")
                        result.put("bottom", (insets.systemWindowInsetBottom / density).toDouble())
                        @Suppress("DEPRECATION")
                        result.put("left", (insets.systemWindowInsetLeft / density).toDouble())
                        @Suppress("DEPRECATION")
                        result.put("right", (insets.systemWindowInsetRight / density).toDouble())
                        invoke.resolve(result)
                        return@runOnUiThread
                    }
                }

                // Fallback - read from system resources
                val statusBarId = activity.resources.getIdentifier("status_bar_height", "dimen", "android")
                val statusBarPx = if (statusBarId > 0) activity.resources.getDimensionPixelSize(statusBarId) else 0
                val navBarId = activity.resources.getIdentifier("navigation_bar_height", "dimen", "android")
                val navBarPx = if (navBarId > 0) activity.resources.getDimensionPixelSize(navBarId) else 0

                result.put("top", (statusBarPx / density).toDouble())
                result.put("bottom", (navBarPx / density).toDouble())
                result.put("left", 0.0)
                result.put("right", 0.0)
                invoke.resolve(result)

            } catch (e: Exception) {
                result.put("top", 0.0)
                result.put("bottom", 0.0)
                result.put("left", 0.0)
                result.put("right", 0.0)
                result.put("error", e.message)
                invoke.resolve(result)
            }
        }
    }
}
