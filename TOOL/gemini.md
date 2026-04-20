# Pulse Optimization Dashboard — Full Build Plan

> **LUMIN PULSE** | V1.3 | Kernel Game Optimizer — GUI Frontend

## Project Overview
This is a React (Vite) frontend that recreates the exact **LUMIN PULSE** desktop application GUI as shown in 25+ reference screenshots. The app is a kernel-level game optimizer with 5 main sections.

## Tech Stack
- **Framework:** Vite + React 19
- **Icons:** lucide-react
- **Styling:** Vanilla CSS (dark theme, #060606 base)
- **Location:** `/TOOL`

---

## Reference Screenshot Analysis

### Tab 1: General Settings (Screenshot_1)
**Status: ✅ Partially Built — needs 2 more fields**

- **Window Settings card**: Hide on Start toggle, Run on Windows Startup toggle ✅
- **Monitoring Settings card**:
  - Scan Interval dropdown (1s/2s/5s) ✅
  - Game Init Wait dropdown (10s/30s/60s) ✅
  - ❌ **MISSING: Reapply Check** dropdown (30 seconds)
  - ❌ **MISSING: Logging Mode** dropdown (Normal)
  - Completion Sounds toggle ✅

### Tab 2: Dashboard (Screenshot_2)
**Status: ❌ Not Built**

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
**Status: ❌ Not Built**

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
**Status: ❌ Not Built**

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
**Status: ❌ Not Built**

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
