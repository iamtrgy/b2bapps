use serde::Serialize;

#[derive(Serialize)]
struct SafeAreaInsets {
    top: f64,
    bottom: f64,
    left: f64,
    right: f64,
}

#[tauri::command]
fn get_safe_area_insets(window: tauri::Window) -> SafeAreaInsets {
    // On desktop, return zeros — CSS env() handles it
    // On Android, the Kotlin code in MainActivity will inject actual values
    // via JavaScript before this is even called, but this serves as fallback
    let _ = window;
    SafeAreaInsets {
        top: 24.0,
        bottom: 24.0,
        left: 0.0,
        right: 0.0,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![get_safe_area_insets]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
