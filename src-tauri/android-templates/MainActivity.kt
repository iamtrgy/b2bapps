package __PACKAGE__

import android.os.Bundle
import app.tauri.TauriActivity

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(SafeAreaPlugin::class.java)
    }
}
