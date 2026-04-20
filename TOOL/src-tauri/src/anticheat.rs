/// Anti-cheat process exclusion list.
/// These processes must NEVER be touched by the optimizer to avoid false positives.
const PROTECTED_PROCESSES: &[&str] = &[
    // Riot Vanguard
    "vgc.exe",
    "vgtray.exe",
    // Easy Anti-Cheat
    "EasyAntiCheat.exe",
    "EasyAntiCheat_EOS.exe",
    // BattlEye
    "BEService.exe",
    "BEService_x64.exe",
    "BattlEye.exe",
    // FACEIT
    "FACEITClient.exe",
    "faceit-anticheat.exe",
    // Ricochet (CoD)
    "ricochet.exe",
    // Valve Anti-Cheat
    "steam_monitor.exe",
    // System-critical processes that should never be modified
    "csrss.exe",
    "smss.exe",
    "lsass.exe",
    "services.exe",
    "wininit.exe",
    "winlogon.exe",
    "System",
];

/// Returns true if the process name is on the protected list and must not be modified.
pub fn is_protected(process_name: &str) -> bool {
    let lower = process_name.to_lowercase();
    PROTECTED_PROCESSES.iter().any(|&p| p.to_lowercase() == lower)
}

/// Maximum priority class we allow. We cap at HIGH and never use REALTIME
/// to avoid system instability and unnecessary anti-cheat red flags.
pub const MAX_ALLOWED_PRIORITY: i32 = 13; // HIGH_PRIORITY_CLASS base priority

/// Minimum access rights for process handles.
/// We only request PROCESS_SET_INFORMATION — never VM_READ or VM_WRITE.
pub const SAFE_ACCESS_RIGHTS: u32 = 0x0200; // PROCESS_SET_INFORMATION
