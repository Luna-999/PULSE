# Pulse Optimization Dashboard — Full Build Plan

> **LUMIN PULSE** | V1.3 | Kernel Game Optimizer — GUI Frontend

## Project Overview
Lumin Pulse is a high-performance **Kernel-level Game Optimizer** designed specifically for Windows. Unlike many "game boosters" that simply clear RAM or close background apps, Pulse works natively with the Windows Kernel and Scheduler to re-prioritize system resources in real-time. 

The goal of this application is to **actually adjust the system** at a low level to minimize input latency, maximize CPU throughput for game threads, and ensure that background processes do not interfere with the gaming experience.

## Core Optimization Philosophy
Pulse operates on several key "Native Windows" pillars to achieve true optimization:

1.  **Native Scheduling Control:** Using `SetPriorityClass` and `SetThreadPriority` to ensure the game's critical threads (Render, RHI, Game) always have the highest scheduling precedence.
2.  **Kernel-Level Affinity:** Managing CPU Affinity to pin game processes to high-performance P-cores (on hybrid CPUs) while keeping background noise on efficiency cores.
3.  **Power Management:** Utilizing `PowerSetRequest` and disabling `Power Throttling` per-thread to prevent the CPU from entering low-power states (C-states) during critical gaming moments.
4.  **Multimedia Class Scheduling (MMCSS):** Leveraging the Windows MMCSS API (Pro Audio/Games profiles) to reduce scheduling jitter for latency-sensitive audio and rendering tasks.
5.  **Stealth & Safety:** Operating within standard Windows API boundaries to remain 100% Anti-Cheat safe (EAC, BattlEye, VAC) without memory injection or driver-level risk.

## Technical Fixes & Improvements

### 1. Native File Browsing (✅ Implemented)
- **Problem:** Adding a game was a manual text-entry process, which was prone to errors and felt "simulated" rather than functional.
- **Fix:** Integrated `tauri-plugin-dialog` into the backend and added a "Browse..." button to the "Add Game" modal.
- **Technical Details:**
    - **Backend:** Created a `pick_game_exe` Rust command in `main.rs` that invokes the native Windows File Picker. It filters for `.exe` files and returns the filename to the frontend.
    - **Frontend:** Updated `GameProfiles` component to call this command. When a file is selected, the "Process Name" field is auto-populated, and a 2-letter "Icon Label" is suggested based on the filename.
    - **UI:** Styled the `browse-input-group` in `index.css` to keep the layout clean and modern.

### 2. Priority Class Reconciliation (✅ Implemented)
- **Problem:** The reference screenshots showed a `REALTIME` priority option, but it was missing from the UI and only partially handled by the backend logic.
- **Fix:** Added `REALTIME` to the dropdown menu in Optimization Settings and ensured the backend maps it correctly.
- **Safety Logic:** Per the `anticheat.rs` safety mandates, the backend `set_process_priority` function caps the base priority at `HIGH` (13) for most processes to avoid system lockups and anti-cheat flags. However, the UI now correctly reflects the user's intent to use maximum optimization.

### 3. Native Windows Integration
- **Optimization Logic:** The application uses `windows-rs` to interact with low-level system APIs:
    - `SetPriorityClass`: Adjusts process-level scheduling priority.
    - `SetThreadPriority`: Fine-tunes individual game threads.
    - `PowerSetRequest`: Prevents CPU down-clocking during gaming.
    - `Mmcss`: Utilizes the Multimedia Class Scheduler Service for "Pro Audio" profiles.
- **Real-Time Feedback:** The `spawn_console_window` feature ensures that all optimization actions are logged to a separate terminal window, providing transparency into what Pulse is doing to the system.

## Reference Screenshot Analysis

### Tab 1: General Settings (Screenshot_1)
**Status: ✅ Built**
... (rest of the file)

Layout:
1. **Three status cards** in a row, each with a colored left border:
   - PULSE STATUS (blue `#3b82f6` left border) → badge "NOT RUNNING", desc "Main application status"
   - AUTO-START (orange `#f59e0b` left border) → badge "DISABLED", desc "Windows startup behavior"
   - LICENSE (green `#10b981` left border) → badge "ACTIVE", desc "Subscription active"
2. **Current Configuration card** — 2-column grid of key/value pairs:
   - Priority Class → BALANCED
   - Scan Interval → 2 seconds
   - Turbo Mode → Enabled (green text)
   - DWM Optimization → Enabled (green text)
   - Game Profiles → 3 configured
   - Background Processes → 36 monitored
   - Hide on Start → Disabled
   - Background Optimization → Enabled (green text)

### Tab 3: Optimization Settings (Screenshot_3)
**Status: ✅ Built**

Layout — 4 cards stacked vertically:
1. **Priority Class** card — single row with label + dropdown (BALANCED/HIGH/REALTIME/ABOVE_NORMAL/NORMAL)
2. **System Optimizations** card — 2-column grid of toggle items:
   - Background Apps (Deprioritize Chrome, Discord, Spotify, etc.)
   - DWM Optimization (Optimize Desktop Window Manager threads)
3. **CPU Core Management** card — 3-column grid:
   - Smart Affinity (Pin to P-cores on hybrid CPUs)
   - CPU Sets (Reserve cores for game process)
   - Ideal Processor (Hint preferred core for cache locality)
4. **Thread Performance** card — 3-column grid (2 rows):
   - Row 1: Extreme Priority, Power Throttling, Power Request
   - Row 2: Thread QoS, Priority Boost, Pro Audio MMCSS
   - Each has a label, description, and toggle

### Tab 4: Game Profiles (Screenshots 4-5)
**Status: ✅ Built**

Layout:
- Header row: title + page subtitle + **"+ Add Game"** button (top-right, white outlined)
- **Game list** — each game is an expandable card:
  - Collapsed: game icon (colored square with letter), game name (`.exe`), "Priority: 0  Threads: X", green "ACTIVE" badge, expand chevron
  - Expanded: shows additional controls:
    - Enabled toggle, Priority input field, Affinity input field
    - **Thread Configurations** section with "+ Add Thread" button
    - Table: Thread Name | Priority | Affinity | Disable Boost (checkbox) | Actions (delete)
    - "Remove Game" link at bottom
- Default games: FortniteClient-Win64-Shipping.exe (7 threads), VALORANT-Win64-Shipping.exe (13 threads), cs2.exe (4 threads)

### Tab 5: Background Processes (Screenshots 6-8)
**Status: ✅ Built**

Layout:
- Header row: title + subtitle + **"+ Add Process"** button (top-right, white outlined)
- **Process list** — each is an expanded card showing:
  - Process name (e.g., explorer.exe), "Priority: -15 • Affinity: ALL", delete icon (red)
  - Priority input (-15), Affinity input (ALL), Disable Boost toggle
  - Thread Configurations section with "+ Add Thread" button and table header
- Default processes: explorer.exe, ShellExperienceHost.exe, sihost.exe, ctfmon.exe, StartMenuExperienceHost.exe, SearchHost.exe, TextInputHost.exe

---

## Design System Notes

From the screenshots, the design uses:
- **Background:** #060606 (near-black)
- **Panel/Card bg:** #111111
- **Card inner bg:** #161616
- **Borders:** #222222
- **Accent (green):** #10b981
- **Text primary:** #f0f0f0
- **Text secondary:** #888888
- **Status badge colors:** Blue (#3b82f6), Orange (#f59e0b), Green (#10b981), Red (#ef4444)
- **Toggle switches:** Green accent when on, #333 when off
- **Font:** Inter (already loaded)
- **Card border-radius:** 12px
- **Input fields:** Dark bg (#060606), border #222, centered text

---

## Build Progress

- [x] Project setup (Vite + React)
- [x] Install lucide-react dependency
- [x] Base CSS design system (variables, layout, sidebar, toggles, selects)
- [x] Sidebar navigation with all 5 tabs
- [x] General Settings tab (complete — Reapply Check + Logging Mode added)
- [x] Dashboard tab (status cards + config grid)
- [x] Optimization Settings tab (Priority Class, System Opts, CPU Core, Thread Perf)
- [x] Game Profiles tab (expand/collapse, thread table, remove game/thread)
- [x] Background Processes tab (expanded process cards, thread configs)
- [x] All supporting CSS for new components
- [x] Inter font loaded via Google Fonts
- [x] Window controls (minimize/close) in header
- [x] Dev server verified — all tabs rendering correctly
