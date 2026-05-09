#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod anticheat;
mod config;
mod optimizer;
mod scanner;

use std::sync::Mutex;
use std::process::Command;
use tauri::{AppHandle, State, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;
use std::time::Duration;

/// Application state shared across commands
struct AppState {
    is_running: Mutex<bool>,
}

// ─── Tauri Commands ───────────────────────────────────────────────

#[tauri::command]
fn get_running_processes() -> Vec<scanner::ProcessInfo> {
    scanner::get_running_processes()
}

#[tauri::command]
fn get_process_threads(pid: u32) -> Vec<scanner::ThreadInfo> {
    scanner::get_threads_for_process(pid)
}

#[tauri::command]
fn read_config() -> Result<config::AppConfig, String> {
    config::read_config()
}

#[tauri::command]
fn write_config(config: config::AppConfig) -> Result<(), String> {
    config::write_config(&config)
}

#[tauri::command]
fn start_optimization_session(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<optimizer::OptimizationResult>, String> {
    let cfg = config::read_config()?;
    {
        let mut running = state.is_running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }
    let results = optimizer::apply_all(&app, &cfg);
    Ok(results)
}

#[tauri::command]
fn stop_optimization_session(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<optimizer::OptimizationResult>, String> {
    let mut running = state.is_running.lock().map_err(|e| e.to_string())?;
    *running = false;
    let results = optimizer::revert_all(Some(&app));
    Ok(results)
}

#[tauri::command]
fn get_pulse_status(state: State<'_, AppState>) -> bool {
    *state.is_running.lock().unwrap_or_else(|e| e.into_inner())
}

#[tauri::command]
fn is_protected_process(name: String) -> bool {
    anticheat::is_protected(&name)
}

#[tauri::command]
async fn pick_game_exe(window: tauri::Window) -> Result<Option<String>, String> {
    let file_path = window.dialog()
        .file()
        .add_filter("Executable", &["exe"])
        .set_title("Select Game Executable")
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_buf = path.into_path().map_err(|_| "Failed to convert path".to_string())?;
            let filename = path_buf.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string());
            Ok(filename)
        },
        None => Ok(None),
    }
}

#[tauri::command]
fn force_exit(app: AppHandle) {
    let _ = optimizer::revert_all(Some(&app));
    std::process::exit(0);
}

#[tauri::command]
fn spawn_console_window() -> Result<(), String> {
    let log_path = std::env::temp_dir().join("pulse_log.txt");
    
    let ps_script = format!(r#"
$Host.UI.RawUI.BackgroundColor = 'Black'
$Host.UI.RawUI.ForegroundColor = 'Gray'
try {{ $Host.UI.RawUI.WindowTitle = 'Lumin Pulse Kernel Optimizer Console' }} catch {{}}
Clear-Host

Write-Host "Initializing Lumin Pulse IPC Bridge..." -ForegroundColor Magenta
Start-Sleep -Seconds 1
Write-Host "Connected to core engine. Tailing log file: {log_path}" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

if (Test-Path "{log_path}") {{
    Get-Content -Path "{log_path}" -Wait -Tail 10
}} else {{
    Write-Host "Waiting for log file to be created..." -ForegroundColor Yellow
    while (-not (Test-Path "{log_path}")) {{ Start-Sleep -Seconds 1 }}
    Get-Content -Path "{log_path}" -Wait
}}
"#, log_path = log_path.to_string_lossy());

    let temp_path = std::env::temp_dir().join("pulse_console.ps1");
    std::fs::write(&temp_path, &ps_script)
        .map_err(|e| format!("Failed to write temp script: {}", e))?;

    Command::new("cmd")
        .args([
            "/c",
            "start",
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File",
            temp_path.to_str().unwrap_or("pulse_console.ps1"),
        ])
        .spawn()
        .map_err(|e| format!("Failed to spawn console window: {}", e))?;

    Ok(())
}

#[tauri::command]
fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;

    if enabled {
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        key.set_value("LuminPulse", &current_exe.to_str().unwrap_or_default()).map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value("LuminPulse");
    }
    Ok(())
}

#[tauri::command]
async fn validate_license(key: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let res = client.post("https://lumintweaks.com/api/validate")
        .json(&serde_json::json!({ "key": key }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(res.status().is_success())
}

// ─── Entry Point ──────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            is_running: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            get_running_processes,
            get_process_threads,
            read_config,
            write_config,
            start_optimization_session,
            stop_optimization_session,
            get_pulse_status,
            is_protected_process,
            pick_game_exe,
            force_exit,
            spawn_console_window,
            window_minimize,
            set_autostart,
            validate_license,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Check for updates on startup
            let handle_clone = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(updater) = handle_clone.updater() {
                   if let Ok(Some(update)) = updater.check().await {
                       println!("Update available: {}", update.version);
                   }
                }
            });

            // Phase 3: Background detection loop
            std::thread::spawn(move || {
                loop {
                    let cfg = match config::read_config() {
                        Ok(c) => c,
                        Err(_) => {
                            std::thread::sleep(Duration::from_secs(5));
                            continue;
                        }
                    };

                    let running = scanner::get_running_processes();
                    for profile in &cfg.game_profiles {
                        if !profile.enabled { continue; }
                        if let Some(proc) = running.iter().find(|p| p.name.eq_ignore_ascii_case(&profile.name)) {
                            let _ = optimizer::apply_game_profile(&handle, proc, profile);
                        }
                    }
                    std::thread::sleep(Duration::from_secs(cfg.general.scan_interval_seconds as u64));
                }
            });

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let WindowEvent::Destroyed = event {
                std::process::exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Pulse");
}
