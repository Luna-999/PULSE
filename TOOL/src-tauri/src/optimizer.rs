use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::*;
use crate::anticheat;
use crate::scanner;
use crate::config::{AppConfig, GameProfile, BackgroundProcess};
use std::sync::Mutex;
use std::collections::HashMap;

/// Tracks the original state of a process before we modified it,
/// so we can restore it when the user stops Pulse.
#[derive(Debug, Clone)]
pub struct OriginalProcessState {
    pub pid: u32,
    pub name: String,
    pub original_priority_class: u32,
    pub original_affinity: usize,
    pub boost_was_disabled: bool,
}

/// Global storage for original process states — populated during optimization,
/// read during revert.
lazy_static::lazy_static! {
    static ref ORIGINAL_STATES: Mutex<HashMap<u32, OriginalProcessState>> = Mutex::new(HashMap::new());
}

/// Query the current priority class of a process.
fn get_process_priority_class(pid: u32) -> Option<u32> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, pid).ok()?;
        let pclass = GetPriorityClass(handle);
        let _ = CloseHandle(handle);
        if pclass == 0 { None } else { Some(pclass) }
    }
}

/// Query the current affinity mask of a process.
fn get_process_affinity(pid: u32) -> Option<usize> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, pid).ok()?;
        let mut process_mask: usize = 0;
        let mut system_mask: usize = 0;
        let result = GetProcessAffinityMask(handle, &mut process_mask, &mut system_mask);
        let _ = CloseHandle(handle);
        if result.is_ok() { Some(process_mask) } else { None }
    }
}

/// Save the original state of a process before modifying it.
fn snapshot_process(pid: u32, name: &str) {
    let mut states = match ORIGINAL_STATES.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    // Don't overwrite if we already have a snapshot
    if states.contains_key(&pid) {
        return;
    }

    let priority_class = get_process_priority_class(pid).unwrap_or(0x20); // NORMAL
    let affinity = get_process_affinity(pid).unwrap_or(usize::MAX);

    states.insert(pid, OriginalProcessState {
        pid,
        name: name.to_string(),
        original_priority_class: priority_class,
        original_affinity: affinity,
        boost_was_disabled: false,
    });
}

/// Set the priority class of a process by PID.
/// Maps string priority names to Windows priority classes.
pub fn set_process_priority(pid: u32, priority: i32) -> Result<String, String> {
    let priority_class = match priority {
        p if p >= 13 => HIGH_PRIORITY_CLASS,
        p if p > 0 => ABOVE_NORMAL_PRIORITY_CLASS,
        0 => NORMAL_PRIORITY_CLASS,
        p if p > -15 => BELOW_NORMAL_PRIORITY_CLASS,
        _ => IDLE_PRIORITY_CLASS,
    };

    unsafe {
        let handle = OpenProcess(PROCESS_SET_INFORMATION, false, pid)
            .map_err(|e| format!("Failed to open process {}: {}", pid, e))?;

        let result = SetPriorityClass(handle, priority_class);
        let _ = CloseHandle(handle);
        result.map_err(|e| format!("Failed to set priority for PID {}: {}", pid, e))?;
    }
    Ok(format!("Priority set for PID {}", pid))
}

/// Set CPU affinity mask for a process.
/// affinity_str can be "ALL" or a comma-separated list like "0,1,2,3"
/// or a range like "0-7".
pub fn set_process_affinity(pid: u32, affinity_str: &str) -> Result<String, String> {
    let mask: usize = if affinity_str.eq_ignore_ascii_case("ALL") {
        // Use all available cores
        usize::MAX
    } else if affinity_str.contains('-') {
        // Range format: "0-7"
        let parts: Vec<&str> = affinity_str.split('-').collect();
        if parts.len() != 2 {
            return Err("Invalid affinity range format".to_string());
        }
        let start: u32 = parts[0].trim().parse().map_err(|_| "Invalid range start")?;
        let end: u32 = parts[1].trim().parse().map_err(|_| "Invalid range end")?;
        let mut m: usize = 0;
        for i in start..=end {
            m |= 1 << i;
        }
        m
    } else {
        // Comma-separated: "0,1,2,3"
        let mut m: usize = 0;
        for part in affinity_str.split(',') {
            let core: u32 = part.trim().parse().map_err(|_| "Invalid core number")?;
            m |= 1 << core;
        }
        m
    };

    unsafe {
        let handle = OpenProcess(PROCESS_SET_INFORMATION, false, pid)
            .map_err(|e| format!("Failed to open process {}: {}", pid, e))?;

        let result = SetProcessAffinityMask(handle, mask);
        let _ = CloseHandle(handle);
        result.map_err(|e| format!("Failed to set affinity for PID {}: {}", pid, e))?;
    }
    Ok(format!("Affinity set for PID {} to mask 0x{:X}", pid, mask))
}

/// Disable priority boost for a process (prevents dynamic priority fluctuations).
pub fn set_priority_boost_disabled(pid: u32, disable: bool) -> Result<String, String> {
    unsafe {
        let handle = OpenProcess(PROCESS_SET_INFORMATION, false, pid)
            .map_err(|e| format!("Failed to open process {}: {}", pid, e))?;

        let result = SetProcessPriorityBoost(handle, disable);
        let _ = CloseHandle(handle);
        result.map_err(|e| format!("Failed to set priority boost for PID {}: {}", pid, e))?;
    }
    Ok(format!("Priority boost {} for PID {}", if disable { "disabled" } else { "enabled" }, pid))
}

/// Set thread priority for a specific thread by thread ID.
pub fn set_thread_priority(thread_id: u32, priority: i32) -> Result<String, String> {
    // Cap priority to avoid REALTIME range
    let capped = priority.clamp(-15, anticheat::MAX_ALLOWED_PRIORITY);

    unsafe {
        let handle = OpenThread(THREAD_SET_INFORMATION, false, thread_id)
            .map_err(|e| format!("Failed to open thread {}: {}", thread_id, e))?;

        let result = SetThreadPriority(handle, THREAD_PRIORITY(capped));
        let _ = CloseHandle(handle);
        result.map_err(|e| format!("Failed to set thread priority for TID {}: {}", thread_id, e))?;
    }
    Ok(format!("Thread {} priority set to {}", thread_id, capped))
}

/// Result of applying optimizations for a single process
#[derive(Debug, Clone, serde::Serialize)]
pub struct OptimizationResult {
    pub process_name: String,
    pub pid: u32,
    pub success: bool,
    pub message: String,
}

/// Apply a game profile to a running process
pub fn apply_game_profile(proc: &scanner::ProcessInfo, profile: &GameProfile) -> OptimizationResult {
    if anticheat::is_protected(&proc.name) {
        return OptimizationResult {
            process_name: proc.name.clone(),
            pid: proc.pid,
            success: false,
            message: "Skipped — protected anti-cheat process".to_string(),
        };
    }

    // Snapshot original state before modifying
    snapshot_process(proc.pid, &proc.name);

    let mut messages = Vec::new();

    // Set process priority
    match set_process_priority(proc.pid, profile.priority) {
        Ok(msg) => messages.push(msg),
        Err(e) => messages.push(format!("Priority error: {}", e)),
    }

    // Set affinity
    match set_process_affinity(proc.pid, &profile.affinity) {
        Ok(msg) => messages.push(msg),
        Err(e) => messages.push(format!("Affinity error: {}", e)),
    }

    // Set thread priorities if thread configs exist
    let threads = scanner::get_threads_for_process(proc.pid);
    for thread in &threads {
        // Apply per-thread priority from profile thread configs
        for thread_cfg in &profile.threads {
            // Try to match by thread name pattern (best effort — thread names
            // aren't directly available via ToolHelp, so we apply to all threads
            // based on position/priority matching in a real implementation)
            if let Err(e) = set_thread_priority(thread.thread_id, thread_cfg.priority) {
                messages.push(format!("Thread {} error: {}", thread.thread_id, e));
            }
        }
    }

    OptimizationResult {
        process_name: proc.name.clone(),
        pid: proc.pid,
        success: true,
        message: messages.join("; "),
    }
}

/// Apply background process deprioritization
pub fn apply_background_profile(proc: &scanner::ProcessInfo, profile: &BackgroundProcess) -> OptimizationResult {
    if anticheat::is_protected(&proc.name) {
        return OptimizationResult {
            process_name: proc.name.clone(),
            pid: proc.pid,
            success: false,
            message: "Skipped — protected process".to_string(),
        };
    }

    // Snapshot original state before modifying
    snapshot_process(proc.pid, &proc.name);

    let mut messages = Vec::new();

    match set_process_priority(proc.pid, profile.priority) {
        Ok(msg) => messages.push(msg),
        Err(e) => messages.push(format!("Priority error: {}", e)),
    }

    match set_process_affinity(proc.pid, &profile.affinity) {
        Ok(msg) => messages.push(msg),
        Err(e) => messages.push(format!("Affinity error: {}", e)),
    }

    if profile.disable_boost {
        // Track that we disabled boost so we can re-enable on revert
        if let Ok(mut states) = ORIGINAL_STATES.lock() {
            if let Some(state) = states.get_mut(&proc.pid) {
                state.boost_was_disabled = true;
            }
        }

        match set_priority_boost_disabled(proc.pid, true) {
            Ok(msg) => messages.push(msg),
            Err(e) => messages.push(format!("Boost error: {}", e)),
        }
    }

    OptimizationResult {
        process_name: proc.name.clone(),
        pid: proc.pid,
        success: true,
        message: messages.join("; "),
    }
}

/// Apply all optimizations based on config — called when user clicks "Start Pulse"
pub fn apply_all(config: &AppConfig) -> Vec<OptimizationResult> {
    let running = scanner::get_running_processes();
    let mut results = Vec::new();

    // Apply game profiles
    for profile in &config.game_profiles {
        if !profile.enabled {
            continue;
        }
        // Find matching running process
        for proc in &running {
            if proc.name.eq_ignore_ascii_case(&profile.name) {
                results.push(apply_game_profile(proc, profile));
            }
        }
    }

    // Apply background process deprioritization
    for bg_profile in &config.background_processes {
        for proc in &running {
            if proc.name.eq_ignore_ascii_case(&bg_profile.name) {
                results.push(apply_background_profile(proc, bg_profile));
            }
        }
    }

    results
}

/// Revert all modified processes back to their original state.
/// Called when user clicks "Stop Pulse" or when a game closes.
pub fn revert_all() -> Vec<OptimizationResult> {
    let states = match ORIGINAL_STATES.lock() {
        Ok(s) => s.clone(),
        Err(e) => {
            return vec![OptimizationResult {
                process_name: "SYSTEM".to_string(),
                pid: 0,
                success: false,
                message: format!("Failed to lock state: {}", e),
            }];
        }
    };

    let mut results = Vec::new();

    for (pid, state) in &states {
        let mut messages = Vec::new();

        // Restore priority class
        unsafe {
            if let Ok(handle) = OpenProcess(PROCESS_SET_INFORMATION, false, *pid) {
                // Convert the stored u32 back to a PROCESS_CREATION_FLAGS
                let flags = PROCESS_CREATION_FLAGS(state.original_priority_class);
                match SetPriorityClass(handle, flags) {
                    Ok(()) => messages.push(format!("Restored priority class 0x{:X}", state.original_priority_class)),
                    Err(e) => messages.push(format!("Restore priority error: {}", e)),
                }
                let _ = CloseHandle(handle);
            }
        }

        // Restore affinity
        unsafe {
            if let Ok(handle) = OpenProcess(PROCESS_SET_INFORMATION, false, *pid) {
                match SetProcessAffinityMask(handle, state.original_affinity) {
                    Ok(()) => messages.push(format!("Restored affinity mask 0x{:X}", state.original_affinity)),
                    Err(e) => messages.push(format!("Restore affinity error: {}", e)),
                }
                let _ = CloseHandle(handle);
            }
        }

        // Re-enable priority boost if we disabled it
        if state.boost_was_disabled {
            match set_priority_boost_disabled(*pid, false) {
                Ok(msg) => messages.push(msg),
                Err(e) => messages.push(format!("Restore boost error: {}", e)),
            }
        }

        results.push(OptimizationResult {
            process_name: state.name.clone(),
            pid: *pid,
            success: true,
            message: messages.join("; "),
        });
    }

    // Clear the saved states
    if let Ok(mut s) = ORIGINAL_STATES.lock() {
        s.clear();
    }

    results
}
