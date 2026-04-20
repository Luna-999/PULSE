use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Diagnostics::ToolHelp::*;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub thread_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ThreadInfo {
    pub thread_id: u32,
    pub owner_pid: u32,
    pub base_priority: i32,
}

/// Enumerate all running processes using the Win32 ToolHelp API
pub fn get_running_processes() -> Vec<ProcessInfo> {
    let mut processes = Vec::new();
    unsafe {
        let snapshot = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            Ok(h) => h,
            Err(_) => return processes,
        };

        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let name = String::from_utf16_lossy(
                    &entry.szExeFile[..entry
                        .szExeFile
                        .iter()
                        .position(|&x| x == 0)
                        .unwrap_or(entry.szExeFile.len())],
                );
                processes.push(ProcessInfo {
                    pid: entry.th32ProcessID,
                    name,
                    thread_count: entry.cntThreads,
                });
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }
    processes
}

/// Enumerate all threads belonging to a specific process
pub fn get_threads_for_process(pid: u32) -> Vec<ThreadInfo> {
    let mut threads = Vec::new();
    unsafe {
        let snapshot = match CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) {
            Ok(h) => h,
            Err(_) => return threads,
        };

        let mut entry = THREADENTRY32::default();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        if Thread32First(snapshot, &mut entry).is_ok() {
            loop {
                if entry.th32OwnerProcessID == pid {
                    threads.push(ThreadInfo {
                        thread_id: entry.th32ThreadID,
                        owner_pid: entry.th32OwnerProcessID,
                        base_priority: entry.tpBasePri,
                    });
                }
                if Thread32Next(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }
    threads
}
