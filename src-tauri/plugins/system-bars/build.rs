const COMMANDS: &[&str] = &[
    "set_theme",
    "get_insets",
    "set_keep_screen_on",
    "set_brightness",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
