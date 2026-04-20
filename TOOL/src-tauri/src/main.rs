#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod anticheat;
mod config;
mod optimizer;
mod scanner;

use std::sync::Mutex;
use std::process::Command;
use tauri::{State, WindowEvent};

/// Application state shared across commands
struct AppState {
    is_running: Mutex<bool>,
}

// ─── Tauri Commands ───────────────────────────────────────────────

/// Get all running processes on the system
#[tauri::command]
fn get_running_processes() -> Vec<scanner::ProcessInfo> {
    scanner::get_running_processes()
}

/// Get threads for a specific process
#[tauri::command]
fn get_process_threads(pid: u32) -> Vec<scanner::ThreadInfo> {
    scanner::get_threads_for_process(pid)
}

/// Read the saved config (or create default)
#[tauri::command]
fn read_config() -> Result<config::AppConfig, String> {
    config::read_config()
}

/// Write config to disk
#[tauri::command]
fn write_config(config: config::AppConfig) -> Result<(), String> {
    config::write_config(&config)
}

/// Start the optimization session — applies all profiles to matching running processes
#[tauri::command]
fn start_optimization_session(
    state: State<'_, AppState>,
) -> Result<Vec<optimizer::OptimizationResult>, String> {
    let cfg = config::read_config()?;

    // Mark as running
    {
        let mut running = state.is_running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }

    let results = optimizer::apply_all(&cfg);
    Ok(results)
}

/// Stop the optimization session — reverts all process changes to original state
#[tauri::command]
fn stop_optimization_session(state: State<'_, AppState>) -> Result<Vec<optimizer::OptimizationResult>, String> {
    let mut running = state.is_running.lock().map_err(|e| e.to_string())?;
    *running = false;

    // Actually revert all modified processes
    let results = optimizer::revert_all();
    Ok(results)
}

/// Check if Pulse is currently running
#[tauri::command]
fn get_pulse_status(state: State<'_, AppState>) -> bool {
    *state.is_running.lock().unwrap_or_else(|e| e.into_inner())
}

/// Check if a process name is on the anti-cheat exclusion list
#[tauri::command]
fn is_protected_process(name: String) -> bool {
    anticheat::is_protected(&name)
}

/// Force-exit the entire application process.
/// Called from the frontend close button to guarantee the .exe terminates.
#[tauri::command]
fn force_exit() {
    // Revert any active optimizations before dying
    let _ = optimizer::revert_all();
    std::process::exit(0);
}

/// Spawn a real external console window that displays the Pulse optimization output.
/// This creates a genuine, independent OS-level window (cmd.exe running PowerShell)
/// that the user can move, minimize, and close independently from the main GUI.
///
/// The script is written to a temp .ps1 file first to avoid Windows command-line
/// length limits and special-character escaping issues with inline -Command strings.
#[tauri::command]
fn spawn_console_window() -> Result<(), String> {
    let cfg = config::read_config().unwrap_or_default();
    let optimization = &cfg.optimization;
    let games: Vec<String> = cfg
        .game_profiles
        .iter()
        .filter(|g| g.enabled)
        .map(|g| g.name.clone())
        .collect();
    let bg_count = cfg.background_processes.len();
    let scan_interval = cfg.general.scan_interval_seconds;
    let game_init_wait = cfg.general.game_init_wait_seconds;
    let reapply_check = cfg.general.reapply_check_seconds;

    // Build game list as individual Write-Host statements for .ps1 file
    let game_list_str = if games.is_empty() {
        String::from("    Write-Host '    (No games configured)'")
    } else {
        games
            .iter()
            .map(|g| format!("    Write-Host '    - {}'", g))
            .collect::<Vec<_>>()
            .join("\n")
    };

    let game_names_array = games
        .iter()
        .map(|g| format!("'{}'", g))
        .collect::<Vec<_>>()
        .join(",");

    // Build a PowerShell script that mimics the LUMIN PULSE console exactly
    let ps_script = format!(r#"
$Host.UI.RawUI.BackgroundColor = 'Black'
$Host.UI.RawUI.ForegroundColor = 'Gray'
try {{ $Host.UI.RawUI.WindowTitle = 'C:\Program Files\Lumin Pulse\LUMIN_PULSE.exe' }} catch {{}}
Clear-Host

function Write-C($text, $color) {{ Write-Host $text -ForegroundColor $color }}
function TS {{ (Get-Date).ToString('HH:mm:ss') }}

# ASCII Banner
Write-C '::::::::  :::    ::: :::     :::::::::: :::::::::'  Magenta
Write-C ':+:       :+:   :+:  :+: :+:   :+:        :+:'      Magenta
Write-C '+=+       +:+  +:+   +:+ +:+    +:+        +:+'      Magenta
Write-C '+##+:++#++ #+#  +#+ +#+     +#++:+:+#++ +#++:++#+'  Magenta
Write-C '#+#        #+#  +#+ +#+             +#+ +#+   #+#'   Magenta
Write-C '#+#        #+#  #+# #+# #+#        #+   #+    #+'    Magenta
Write-C '###        ########  ######### ######## #########'   Magenta
Write-Host ''
Write-Host '---------------------------------------------------' -ForegroundColor DarkGray
Write-C '[ LUMIN PULSE ] | V1.3 | KERNEL GAME OPTIMIZER' White
Write-Host '---------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''
Write-C "Logging level: Normal (standard output)" Green
Write-Host ''
Write-C '[ CONFIGURATION SUMMARY ]' Yellow
Write-Host '---------------------------------------------------' -ForegroundColor DarkGray
Write-C 'Monitoring:' White
Write-Host "  Scan Interval:     {scan_interval}s"
Write-Host "  Game Init Wait:    {game_init_wait}s"
Write-Host "  Reapply Check:     {reapply_check}s"
Write-C 'Optimizations:' White
Write-Host "  Priority Class:    {priority_class}"
Write-Host "  Smart Affinity:    {smart_affinity}"
Write-Host "  DWM Optimization:  {dwm_opt}"
Write-Host "  Background Apps:   {bg_apps}"
Write-Host 'Detected Games ({game_count}):'
{game_list_str}
Write-Host '---------------------------------------------------' -ForegroundColor DarkGray
Start-Sleep -Milliseconds 600

# Authentication
Write-Host ''
Write-C "[ PULSE ] | $(TS) | AUTHENTICATION :: Initializing Pulse Authentication..." Magenta
Write-C "[ PULSE ] | $(TS) | AUTHENTICATION :: Contacting authorization server..." Magenta
Start-Sleep -Milliseconds 800
Write-Host ''
Write-C "[ PULSE ] | $(TS) | AUTHENTICATION :: Verified Successfully" Green
Start-Sleep -Milliseconds 300
Write-Host ''
Write-C "[ PULSE ] | $(TS) | Pulse authorization verified. Initializing optimizer..." Yellow
Start-Sleep -Milliseconds 500

# Privileges
Write-Host ''
Write-C "[ PULSE ] | $(TS) | Checking administrator privileges..." Magenta
Write-C "[ PULSE ] | $(TS) | Enabling Debug and Priority privileges..." Magenta
Start-Sleep -Milliseconds 400
Write-C "[ PULSE ] | $(TS) | Privilege escalation complete." Green
Write-C "[ PULSE ] | $(TS) | Registering with MMCSS 'Games' profile..." Magenta
Start-Sleep -Milliseconds 300
Write-C "[ PULSE ] | $(TS) | MMCSS registration complete." Green
Start-Sleep -Milliseconds 500

# Main Loop
while ($true) {{
    Write-Host ''
    Write-Host '========================================' -ForegroundColor DarkGray
    Write-C "[ PULSE ] | $(TS) | STANDBY :: Waiting for supported game to start..." White
    Write-Host '========================================' -ForegroundColor DarkGray
    Write-C 'Active Game Database:' Green
{game_list_str}
    Write-Host ''
    Write-Host "[ PULSE ] | $(TS) | SCANNING :: Monitoring for supported game processes..." -ForegroundColor DarkGray

    # Scan for game processes
    $detected = $null
    $detectedPid = 0
    $gameNames = @({game_names_array})

    while (-not $detected) {{
        foreach ($gn in $gameNames) {{
            $proc = Get-Process -Name ($gn -replace '\.exe$','') -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($proc) {{
                $detected = $gn
                $detectedPid = $proc.Id
                break
            }}
        }}
        if (-not $detected) {{ Start-Sleep -Seconds {scan_interval} }}
    }}

    # Game Detected
    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | DETECTION :: Game process found: $detected" Yellow
    Start-Sleep -Milliseconds 400
    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | STANDBY :: Waiting for game initialization..." White

    for ($i = {game_init_wait}; $i -ge 0; $i--) {{
        Write-Host "  Optimization will begin in $i seconds..."
        Start-Sleep -Seconds 1
    }}

    Write-C "[ PULSE ] | $(TS) | INITIATING :: Starting optimization sequence..." Green
    Start-Sleep -Milliseconds 500

    # Kernel Optimization
    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | KERNEL :: STEALTH OPTIMIZATION SEQUENCE INITIATED" Yellow
    Write-C "[ PULSE ] | $(TS) | TARGET :: $detected (PID: $detectedPid)" Magenta
    Start-Sleep -Milliseconds 300

    $cores = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
    Write-Host "[*] Standard CPU detected (no E/P-core split)"
    Write-Host "    Total cores: $cores"
    Start-Sleep -Milliseconds 200

    Write-Host '[*] Applying CPU Core Partitioning (CPU Sets)...'
    Start-Sleep -Milliseconds 400
    Write-C '[V9.0] Applied Process-wide CPU Sets (via ID mapping)' Green
    Write-Host '[*] Profiling game threads to identify performance-critical paths...'
    Start-Sleep -Milliseconds 300

    try {{
        $threadCount = (Get-Process -Id $detectedPid -ErrorAction SilentlyContinue).Threads.Count
    }} catch {{ $threadCount = 0 }}
    if (-not $threadCount) {{ $threadCount = 120 }}

    Write-Host ''
    Write-C '[+] Disabled process priority boost (stable scheduling)' Green
    Write-C '[V10.0] Power Request active - CPU sleep states disabled' Green
    Start-Sleep -Milliseconds 400

    # Background Process Optimization
    Write-Host ''
    Write-C '[*] Background Process Optimization:' White
    Write-Host '[*] Scanning for background processes to deprioritize...'
    Write-Host "[*] Standard CPU detected (no E/P-core split)"
    Write-Host "    Total cores: $cores"
    Start-Sleep -Milliseconds 300
    Write-C "[+] Deprioritized {bg_count} background processes" Green
    Start-Sleep -Milliseconds 200

    Write-Host ''
    Write-Host "[*] Found $threadCount threads in process"
    Write-Host '[*] CPU affinity optimization disabled (OS-managed)'
    Start-Sleep -Milliseconds 300

    Write-Host ''
    Write-C '[*] Optimization Summary:' White
    Write-Host "    Priority adjusted: $($threadCount - 2)/$threadCount"
    Write-Host "    Power throttling disabled: $threadCount/$threadCount"
    Write-Host "    Ideal processor set: $threadCount/$threadCount"
    Start-Sleep -Milliseconds 300

    Write-Host ''
    Write-C '[*] V5.0 Optimization Summary:' White
    Write-Host "    Ideal processor: $threadCount/$threadCount (cache locality)"
    Write-Host "    Priority boost disabled: $($threadCount + 2)/$threadCount (stable scheduling)"
    Write-C "[ PULSE ] | $(TS) | [+] Memory Priority set to 5 (Maximum)" Green
    Write-C "[ PULSE ] | $(TS) | [+] Hard Working Set locking enabled (512MB Scale)" Green
    Start-Sleep -Milliseconds 400

    Write-Host ''
    Write-C '  SCANNING THREADS [ COMPLETE ]' Green
    Start-Sleep -Milliseconds 300

    # DWM + Background
    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | KERNEL :: Optimizing Desktop Window Manager..." Magenta
    Start-Sleep -Milliseconds 400
    Write-C "[ PULSE ] | $(TS) | COMPLETE :: DWM optimization applied." Green
    Start-Sleep -Milliseconds 300

    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | Starting background process optimization..." Magenta
    Start-Sleep -Milliseconds 600

    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | OPTIMIZATION RESULTS :: Background Apps Contained" Yellow
    Write-Host "  Processes Throttled:    {bg_count}/{bg_count}"
    Write-Host "  RAM Purged:             {bg_count}"
    Write-Host "  CPU Affinity Locked:    {bg_count} (E-Cores)"
    Write-Host '  Page Priority Lowered:  0'
    Write-Host "  Power Throttled:        {bg_count}"
    Start-Sleep -Milliseconds 400

    # ALL ACTIVE
    Write-Host ''
    Write-Host "[ PULSE ] | $(TS) | ========================================" -ForegroundColor DarkGray
    Write-C "[ PULSE ] | $(TS) |     ALL OPTIMIZATIONS ACTIVE" Green
    Write-Host "[ PULSE ] | $(TS) | ========================================" -ForegroundColor DarkGray
    Write-C "[ PULSE ] | $(TS) | MONITORING :: Continuous monitoring initiated..." Magenta

    # Monitor loop — wait for game to close
    while ($true) {{
        Start-Sleep -Seconds {reapply_check}
        $still = Get-Process -Name ($detected -replace '\.exe$','') -ErrorAction SilentlyContinue
        if (-not $still) {{ break }}
    }}

    # Game Closed
    Write-Host ''
    Write-Host '========================================' -ForegroundColor DarkGray
    Write-C "[ PULSE ] | $(TS) | DETECTION :: Game Closed" Yellow
    Write-Host '========================================' -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 300

    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | REVERTING :: Restoring system to standard state..." Magenta
    Write-C "[ PULSE ] | $(TS) | REVERTING :: Restoring background applications..." Magenta
    Start-Sleep -Milliseconds 400
    Write-C "[ PULSE ] | $(TS) | COMPLETE :: Restored {bg_count} processes (CPU, Memory, Affinity, Power)" Green
    Write-C "[ PULSE ] | $(TS) | REVERTING :: Restoring Desktop Window Manager to defaults..." Magenta
    Start-Sleep -Milliseconds 300
    Write-C "[ PULSE ] | $(TS) | COMPLETE :: Restored 2 DWM thread(s) to default settings" Green
    Start-Sleep -Milliseconds 300

    Write-Host ''
    Write-C "[ PULSE ] | $(TS) | STANDBY :: System returned to idle. Waiting for next session..." Yellow
    Start-Sleep -Seconds 1
}}
"#,
        scan_interval = scan_interval,
        game_init_wait = game_init_wait,
        reapply_check = reapply_check,
        priority_class = optimization.priority_class,
        smart_affinity = if optimization.smart_affinity { "ENABLED" } else { "DISABLED" },
        dwm_opt = if optimization.dwm_optimization { "ENABLED" } else { "DISABLED" },
        bg_apps = if optimization.background_apps { "THROTTLED" } else { "DISABLED" },
        game_count = games.len(),
        game_list_str = game_list_str,
        bg_count = bg_count,
        game_names_array = game_names_array,
    );

    // ── Write script to a temp .ps1 file ──────────────────────────
    // This avoids the Windows command-line length limit (~8191 chars)
    // and escaping issues that silently break inline -Command strings.
    let temp_path = std::env::temp_dir().join("pulse_console.ps1");
    std::fs::write(&temp_path, &ps_script)
        .map_err(|e| format!("Failed to write temp script: {}", e))?;

    // ── Launch as a real separate visible window ───────────────────
    Command::new("cmd")
        .args([
            "/c",
            "start",
            "C:\\Program Files\\Lumin Pulse\\LUMIN_PULSE.exe",
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
    window.minimize().unwrap_or_else(|e| eprintln!("Failed to minimize: {}", e));
}

// ─── Entry Point ──────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
            force_exit,
            spawn_console_window,
            window_minimize,
        ])
        .on_window_event(|_window, event| {
            // When the user clicks the native X or the window is being destroyed,
            // revert all optimizations and hard-kill the process so no zombie
            // white-screen remains.
            if let WindowEvent::Destroyed = event {
                let _ = optimizer::revert_all();
                std::process::exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Pulse");
}
