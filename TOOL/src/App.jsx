import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Settings, Zap, Gamepad2, Layers, Play, Square, Plus, ChevronDown, ChevronUp, Trash2, Minus, X, CheckCircle, AlertCircle } from 'lucide-react';
import './index.css';

// ─── Tauri Bridge ─────────────────────────────────────────────────
// Dynamically import so the app still works in a plain browser for dev/demo
let invoke = async (cmd, args) => {
  console.log(`[mock] invoke('${cmd}')`, args);
  return null;
};

let isTauriMode = false;

// Try to load Tauri API — if it's available, use real invoke
const initTauri = async () => {
  try {
    const tauri = await import('@tauri-apps/api/core');
    invoke = tauri.invoke;
    isTauriMode = true;
    console.log('[Pulse] Tauri backend connected');
  } catch {
    console.log('[Pulse] Running in browser mode (no backend)');
  }
};
initTauri();

/* ============================================================
   DEFAULT CONFIG — mirrors the original LUMIN PULSE demo exactly
   ============================================================ */
const DEFAULT_CONFIG = {
  general: {
    hideOnStart: false,
    runOnStartup: true,
    scanIntervalSeconds: 2,
    gameInitWaitSeconds: 30,
    reapplyCheckSeconds: 30,
    loggingMode: 'Normal',
    completionSounds: true,
  },
  optimization: {
    priorityClass: 'HIGH',
    backgroundApps: true,
    dwmOptimization: true,
    smartAffinity: true,
    cpuSets: true,
    idealProcessor: true,
    extremePriority: true,
    powerThrottling: true,
    powerRequest: true,
    threadQoS: true,
    priorityBoost: true,
    proAudioMMCSS: true,
  },
  gameProfiles: [
    {
      id: 'fortnite',
      name: 'FortniteClient-Win64-Shipping.exe',
      icon: 'FN',
      iconColor: '#3b82f6',
      priority: 0,
      affinity: 'ALL',
      enabled: true,
      threads: [
        { name: 'RenderThread 0', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'RHIThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'GameThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'AudioMixerRenderThread(2)', priority: 2, affinity: 'ALL', disableBoost: true },
        { name: 'RtcNetworkThread', priority: 0, affinity: 'ALL', disableBoost: true },
        { name: 'RtcWorkerThread', priority: 0, affinity: 'ALL', disableBoost: true },
        { name: 'FAsyncLoadingThread', priority: -15, affinity: 'ALL', disableBoost: true },
      ],
    },
    {
      id: 'valorant',
      name: 'VALORANT-Win64-Shipping.exe',
      icon: 'VL',
      iconColor: '#ef4444',
      priority: 0,
      affinity: 'ALL',
      enabled: true,
      threads: [
        { name: 'RenderThread 0', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'RHIThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'GameThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'AudioMixerRenderThread', priority: 2, affinity: 'ALL', disableBoost: true },
        { name: 'RtcNetworkThread', priority: 0, affinity: 'ALL', disableBoost: true },
        { name: 'RtcWorkerThread', priority: 0, affinity: 'ALL', disableBoost: true },
        { name: 'FAsyncLoadingThread', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'BackgroundWorker 0', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'BackgroundWorker 1', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'BackgroundWorker 2', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'TaskGraph 0', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'TaskGraph 1', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'InputThread', priority: 15, affinity: 'ALL', disableBoost: false },
      ],
    },
    {
      id: 'cs2',
      name: 'cs2.exe',
      icon: 'CS',
      iconColor: '#f59e0b',
      priority: 0,
      affinity: 'ALL',
      enabled: true,
      threads: [
        { name: 'MainThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'RenderThread', priority: 15, affinity: 'ALL', disableBoost: false },
        { name: 'SoundThread', priority: 2, affinity: 'ALL', disableBoost: true },
        { name: 'MaterialThread', priority: 0, affinity: 'ALL', disableBoost: true },
      ],
    },
    {
      id: 'waterpark',
      name: 'WaterparkSimulator.exe',
      icon: 'WP',
      iconColor: '#06b6d4',
      priority: 0,
      affinity: 'ALL',
      enabled: true,
      threads: [],
    },
  ],
  backgroundProcesses: [
    { id: 'explorer', name: 'explorer.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'shellexp', name: 'ShellExperienceHost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'sihost', name: 'sihost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'ctfmon', name: 'ctfmon.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'startmenu', name: 'StartMenuExperienceHost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'searchhost', name: 'SearchHost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'textinput', name: 'TextInputHost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    {
      id: 'chrome', name: 'chrome.exe', priority: -15, affinity: 'ALL', disableBoost: true,
      threads: [
        { name: 'CrBrowserMain', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'CrRendererMain', priority: -15, affinity: 'ALL', disableBoost: true },
      ],
    },
    { id: 'msedge', name: 'msedge.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'firefox', name: 'firefox.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    {
      id: 'discord', name: 'Discord.exe', priority: -15, affinity: 'ALL', disableBoost: true,
      threads: [
        { name: 'AudioRenderThread', priority: -15, affinity: 'ALL', disableBoost: true },
        { name: 'AudioInThread', priority: -15, affinity: 'ALL', disableBoost: true },
      ],
    },
    { id: 'spotify', name: 'Spotify.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'skype', name: 'Skype.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'slack', name: 'Slack.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'teams', name: 'Teams.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'zoom', name: 'Zoom.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'obs64', name: 'obs64.exe', priority: 2, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'medal', name: 'Medal.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'voicemod', name: 'Voicemod.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'steam', name: 'Steam.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'steamweb', name: 'steamwebhelper.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'riotclient', name: 'RiotClientServices.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'armourycrate', name: 'ArmouryCrate.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'steelseries', name: 'SteelSeriesGG.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'razer', name: 'Razer Synapse.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'lghub', name: 'LGHUB.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'corsair', name: 'CorsairService.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'nvcontainer', name: 'nvcontainer.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'nvdisplay', name: 'NVDisplay.Container.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'svchost', name: 'svchost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'dllhost', name: 'dllhost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'conhost', name: 'conhost.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'taskhostw', name: 'taskhostw.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'trustedinstaller', name: 'TrustedInstaller.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'tiworker', name: 'TiWorker.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'runtimebroker', name: 'RuntimeBroker.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
  ],
};

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        <span>{toast.message}</span>
        <button className="toast-close" onClick={() => onDismiss(toast.id)}>
          <X size={12} />
        </button>
      </div>
    ))}
  </div>
);

/* ============================================================
   MODAL COMPONENT — reusable for Add Game, Process, Thread
   ============================================================ */
const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{title}</h3>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="modal-body">
        {children}
      </div>
    </div>
  </div>
);

/* ============================================================
   TAB 1: GENERAL SETTINGS
   ============================================================ */
const GeneralSettings = ({ config, onConfigChange }) => {
  const general = config?.general || {};

  const updateField = (field, value) => {
    onConfigChange({
      ...config,
      general: { ...general, [field]: value }
    });
  };

  return (
    <div className="content-area">
      <h1 className="page-title">General Settings</h1>
      <p className="page-subtitle">Configure basic application behavior and monitoring intervals.</p>

      <div className="settings-card">
        <div className="settings-card-header">Window Settings</div>
        <div className="settings-card-desc">Control application window behavior</div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Hide on Start</h4>
            <p>Minimize application to system tray when launched</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={general.hideOnStart || false} onChange={(e) => updateField('hideOnStart', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Run on Windows Startup</h4>
            <p>Automatically launch Pulse when you log in</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={general.runOnStartup || false} onChange={(e) => updateField('runOnStartup', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">Monitoring Settings</div>
        <div className="settings-card-desc">Configure timing intervals for process monitoring</div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Scan Interval</h4>
            <p>How often to scan for game processes</p>
          </div>
          <select className="custom-select" value={general.scanIntervalSeconds || 2} onChange={(e) => updateField('scanIntervalSeconds', parseInt(e.target.value))}>
            <option value={1}>1 second</option>
            <option value={2}>2 seconds</option>
            <option value={5}>5 seconds</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Game Init Wait</h4>
            <p>Wait time before applying optimizations to new games</p>
          </div>
          <select className="custom-select" value={general.gameInitWaitSeconds || 30} onChange={(e) => updateField('gameInitWaitSeconds', parseInt(e.target.value))}>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Reapply Check</h4>
            <p>Interval to verify and reapply optimizations</p>
          </div>
          <select className="custom-select" value={general.reapplyCheckSeconds || 30} onChange={(e) => updateField('reapplyCheckSeconds', parseInt(e.target.value))}>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Logging Mode</h4>
            <p>Detail level for application logs</p>
          </div>
          <select className="custom-select" value={general.loggingMode || 'Normal'} onChange={(e) => updateField('loggingMode', e.target.value)}>
            <option value="Silent">Silent</option>
            <option value="Normal">Normal</option>
            <option value="Verbose">Verbose</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Completion Sounds</h4>
            <p>Play sounds when optimizations start or complete</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={general.completionSounds !== false} onChange={(e) => updateField('completionSounds', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TAB 2: DASHBOARD
   ============================================================ */
const Dashboard = ({ config, pulseStatus, lastResults }) => {
  const general = config?.general || {};
  const optimization = config?.optimization || {};

  return (
    <div className="content-area">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of your Pulse configuration and status.</p>

      <div className="status-cards-row">
        <div className="status-card">
          <div className="status-card-accent accent-blue"></div>
          <div className="status-card-body">
            <div className="status-card-label">PULSE STATUS</div>
            <span className={`status-badge-pill ${pulseStatus === 'RUNNING' ? 'badge-active' : 'badge-neutral'}`}>
              {pulseStatus === 'RUNNING' ? '● RUNNING' : '○ NOT RUNNING'}
            </span>
            <div className="status-card-desc">Main application status</div>
          </div>
        </div>
        <div className="status-card">
          <div className="status-card-accent accent-orange"></div>
          <div className="status-card-body">
            <div className="status-card-label">AUTO-START</div>
             <span className={`status-badge-pill ${general.runOnStartup ? 'badge-active' : 'badge-neutral'}`}>
              {general.runOnStartup ? 'ENABLED' : 'DISABLED'}
            </span>
            <div className="status-card-desc">Windows startup behavior</div>
          </div>
        </div>
        <div className="status-card">
          <div className="status-card-accent accent-green"></div>
          <div className="status-card-body">
            <div className="status-card-label">LICENSE</div>
            <span className="status-badge-pill badge-active">ACTIVE</span>
            <div className="status-card-desc">Subscription active</div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">Current Configuration</div>
        <div className="settings-card-desc">Active optimization settings</div>

        <div className="config-grid">
          <div className="config-item">
            <span className="config-label">Priority Class</span>
            <span className="config-value">{optimization.priorityClass || 'BALANCED'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Scan Interval</span>
            <span className="config-value">{general.scanIntervalSeconds || 2} seconds</span>
          </div>
          <div className="config-item">
            <span className="config-label">Turbo Mode</span>
            <span className="config-value text-green">{optimization.extremePriority !== false ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">DWM Optimization</span>
            <span className="config-value text-green">{optimization.dwmOptimization !== false ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Game Profiles</span>
            <span className="config-value">{config?.gameProfiles?.length || 0} configured</span>
          </div>
          <div className="config-item">
            <span className="config-label">Background Processes</span>
            <span className="config-value">{config?.backgroundProcesses?.length || 0} monitored</span>
          </div>
          <div className="config-item">
            <span className="config-label">Hide on Start</span>
            <span className="config-value">{general.hideOnStart ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">Background Optimization</span>
            <span className="config-value text-green">{optimization.backgroundApps !== false ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Last Optimization Results */}
      {lastResults && lastResults.length > 0 && (
        <div className="settings-card">
          <div className="settings-card-header">Last Optimization Results</div>
          <div className="settings-card-desc">{lastResults.length} processes affected</div>
          <div className="results-list">
            {lastResults.slice(0, 10).map((r, i) => (
              <div key={i} className={`result-item ${r.success ? 'result-success' : 'result-error'}`}>
                <span className="result-name">{r.process_name}</span>
                <span className="result-pid">PID {r.pid}</span>
                <span className={`result-status ${r.success ? 'text-green' : 'text-red'}`}>
                  {r.success ? '✓ Applied' : '✗ Skipped'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   TAB 3: OPTIMIZATION SETTINGS
   ============================================================ */
const OptimizationToggle = ({ label, desc, checked, onChange }) => (
  <div className="opt-toggle-item">
    <div className="opt-toggle-info">
      <h4>{label}</h4>
      <p>{desc}</p>
    </div>
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider"></span>
    </label>
  </div>
);

const OptimizationSettings = ({ config, onConfigChange }) => {
  const optimization = config?.optimization || {};

  const updateField = (field, value) => {
    onConfigChange({
      ...config,
      optimization: { ...optimization, [field]: value }
    });
  };

  return (
    <div className="content-area">
      <h1 className="page-title">Optimization Settings</h1>
      <p className="page-subtitle">100% EAC-safe optimizations. All settings use thread-level or safe system APIs.</p>

      <div className="settings-card">
        <div className="setting-row">
          <div className="setting-info">
            <h4 className="settings-card-header" style={{ marginBottom: 0 }}>Priority Class</h4>
            <p>Process-wide scheduling priority (REALTIME, HIGH, BALANCED, ABOVE_NORMAL, NORMAL)</p>
          </div>
          <select className="custom-select" value={optimization.priorityClass || 'BALANCED'} onChange={(e) => updateField('priorityClass', e.target.value)}>
            <option value="NORMAL">NORMAL</option>
            <option value="ABOVE_NORMAL">ABOVE_NORMAL</option>
            <option value="BALANCED">BALANCED</option>
            <option value="HIGH">HIGH</option>
            <option value="REALTIME">REALTIME</option>
          </select>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">System Optimizations</div>
        <div className="opt-grid cols-2">
          <OptimizationToggle label="Background Apps" desc="Deprioritize Chrome, Discord, Spotify, etc." checked={optimization.backgroundApps !== false} onChange={(e) => updateField('backgroundApps', e.target.checked)} />
          <OptimizationToggle label="DWM Optimization" desc="Optimize Desktop Window Manager threads" checked={optimization.dwmOptimization !== false} onChange={(e) => updateField('dwmOptimization', e.target.checked)} />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">CPU Core Management</div>
        <div className="opt-grid cols-3">
          <OptimizationToggle label="Smart Affinity" desc="Pin to P-cores on hybrid CPUs" checked={optimization.smartAffinity !== false} onChange={(e) => updateField('smartAffinity', e.target.checked)} />
          <OptimizationToggle label="CPU Sets" desc="Reserve cores for game process" checked={optimization.cpuSets !== false} onChange={(e) => updateField('cpuSets', e.target.checked)} />
          <OptimizationToggle label="Ideal Processor" desc="Hint preferred core for cache locality" checked={optimization.idealProcessor !== false} onChange={(e) => updateField('idealProcessor', e.target.checked)} />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">Thread Performance</div>
        <div className="opt-grid cols-3">
          <OptimizationToggle label="Extreme Priority" desc="Priority 15 for top 2 busiest threads" checked={optimization.extremePriority !== false} onChange={(e) => updateField('extremePriority', e.target.checked)} />
          <OptimizationToggle label="Power Throttling" desc="Disable Windows power throttling per-thread" checked={optimization.powerThrottling !== false} onChange={(e) => updateField('powerThrottling', e.target.checked)} />
          <OptimizationToggle label="Power Request" desc="Prevent CPU sleep states (C-states)" checked={optimization.powerRequest !== false} onChange={(e) => updateField('powerRequest', e.target.checked)} />
          <OptimizationToggle label="Thread QoS" desc="Disable efficiency mode per-thread" checked={optimization.threadQoS !== false} onChange={(e) => updateField('threadQoS', e.target.checked)} />
          <OptimizationToggle label="Priority Boost" desc="Disable dynamic priority fluctuations" checked={optimization.priorityBoost !== false} onChange={(e) => updateField('priorityBoost', e.target.checked)} />
          <OptimizationToggle label="Pro Audio MMCSS" desc="Use 'Games' MMCSS profile for latency" checked={optimization.proAudioMMCSS !== false} onChange={(e) => updateField('proAudioMMCSS', e.target.checked)} />
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TAB 4: GAME PROFILES  (fully wired)
   ============================================================ */
const GameProfiles = ({ config, onConfigChange, addToast }) => {
  const games = config?.gameProfiles || [];
  const [expandedId, setExpandedId] = useState(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [showAddThread, setShowAddThread] = useState(null); // gameId or null
  const [newGame, setNewGame] = useState({ name: '', icon: '', iconColor: '#3b82f6', priority: 0, affinity: 'ALL' });
  const [newThread, setNewThread] = useState({ name: '', priority: 0, affinity: 'ALL', disableBoost: false });

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const handleBrowse = async () => {
    try {
      const fileName = await invoke('pick_game_exe');
      if (fileName) {
        setNewGame(prev => ({
          ...prev,
          name: fileName,
          icon: fileName.substring(0, 2).toUpperCase()
        }));
      }
    } catch (e) {
      console.error('Browse error:', e);
      addToast('Failed to open file dialog', 'error');
    }
  };

  const addGame = () => {
    if (!newGame.name.trim()) {
      addToast('Process name is required', 'error');
      return;
    }
    const id = newGame.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `game_${Date.now()}`;
    const icon = newGame.icon.trim() || newGame.name.substring(0, 2).toUpperCase();
    onConfigChange({
      ...config,
      gameProfiles: [...games, {
        id,
        name: newGame.name.trim(),
        icon,
        iconColor: newGame.iconColor,
        priority: parseInt(newGame.priority) || 0,
        affinity: newGame.affinity || 'ALL',
        enabled: true,
        threads: [],
      }]
    });
    setNewGame({ name: '', icon: '', iconColor: '#3b82f6', priority: 0, affinity: 'ALL' });
    setShowAddGame(false);
    addToast(`Added game profile: ${newGame.name.trim()}`, 'success');
  };

  const removeGame = (id) => {
    const game = games.find(g => g.id === id);
    onConfigChange({
      ...config,
      gameProfiles: games.filter(g => g.id !== id)
    });
    if (expandedId === id) setExpandedId(null);
    addToast(`Removed game profile: ${game?.name || id}`, 'success');
  };

  const updateGameField = (gameId, field, value) => {
    onConfigChange({
      ...config,
      gameProfiles: games.map(g => g.id === gameId ? { ...g, [field]: value } : g)
    });
  };

  const addThread = (gameId) => {
    if (!newThread.name.trim()) {
      addToast('Thread name is required', 'error');
      return;
    }
    onConfigChange({
      ...config,
      gameProfiles: games.map(g => {
        if (g.id !== gameId) return g;
        return {
          ...g,
          threads: [...g.threads, {
            name: newThread.name.trim(),
            priority: parseInt(newThread.priority) || 0,
            affinity: newThread.affinity || 'ALL',
            disableBoost: newThread.disableBoost,
          }]
        };
      })
    });
    setNewThread({ name: '', priority: 0, affinity: 'ALL', disableBoost: false });
    setShowAddThread(null);
    addToast(`Added thread: ${newThread.name.trim()}`, 'success');
  };

  const removeThread = (gameId, threadIdx) => {
    onConfigChange({
      ...config,
      gameProfiles: games.map(g => {
        if (g.id !== gameId) return g;
        return { ...g, threads: g.threads.filter((_, i) => i !== threadIdx) };
      })
    });
  };

  const updateThread = (gameId, threadIdx, field, value) => {
    onConfigChange({
      ...config,
      gameProfiles: games.map(g => {
        if (g.id !== gameId) return g;
        return {
          ...g,
          threads: g.threads.map((t, i) => i === threadIdx ? { ...t, [field]: value } : t)
        };
      })
    });
  };

  return (
    <div className="content-area">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Game Profiles</h1>
          <p className="page-subtitle">Configure per-game optimization settings and thread priorities.</p>
        </div>
        <button className="add-btn" onClick={() => setShowAddGame(true)}>
          <Plus size={16} />
          Add Game
        </button>
      </div>

      {/* Add Game Modal */}
      {showAddGame && (
        <Modal title="Add Game Profile" onClose={() => setShowAddGame(false)}>
          <div className="modal-form">
            <div className="modal-field">
              <label>Process Name (e.g., GameName.exe)</label>
              <div className="browse-input-group">
                <input type="text" className="profile-input" style={{ flex: 1 }} placeholder="GameName-Win64-Shipping.exe" value={newGame.name} onChange={(e) => setNewGame({ ...newGame, name: e.target.value })} />
                <button className="browse-btn" onClick={handleBrowse}>Browse...</button>
              </div>
            </div>
            <div className="modal-field-row">
              <div className="modal-field">
                <label>Icon Label</label>
                <input type="text" className="profile-input" placeholder="GN" maxLength={3} value={newGame.icon} onChange={(e) => setNewGame({ ...newGame, icon: e.target.value })} />
              </div>
              <div className="modal-field">
                <label>Icon Color</label>
                <input type="color" className="color-input" value={newGame.iconColor} onChange={(e) => setNewGame({ ...newGame, iconColor: e.target.value })} />
              </div>
            </div>
            <div className="modal-field-row">
              <div className="modal-field">
                <label>Priority</label>
                <input type="number" className="profile-input" value={newGame.priority} onChange={(e) => setNewGame({ ...newGame, priority: e.target.value })} />
              </div>
              <div className="modal-field">
                <label>Affinity</label>
                <input type="text" className="profile-input" value={newGame.affinity} onChange={(e) => setNewGame({ ...newGame, affinity: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowAddGame(false)}>Cancel</button>
              <button className="modal-submit-btn" onClick={addGame}>Add Game</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="profile-list">
        {games.map(game => (
          <div key={game.id} className="profile-card">
            <div className="profile-card-header" onClick={() => toggleExpand(game.id)}>
              <div className="profile-icon" style={{ backgroundColor: game.iconColor }}>
                {game.icon}
              </div>
              <div className="profile-header-info">
                <h4>{game.name}</h4>
                <span className="profile-meta">Priority: {game.priority}    Threads: {game.threads.length}</span>
              </div>
              <span className={`active-badge ${!game.enabled ? 'badge-inactive' : ''}`}>{game.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
              {expandedId === game.id ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
            </div>

            {expandedId === game.id && (
              <div className="profile-card-expanded">
                <div className="profile-controls">
                  <div className="profile-control-item">
                    <span className="profile-control-label">Enabled</span>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={game.enabled} onChange={(e) => updateGameField(game.id, 'enabled', e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="profile-control-item">
                    <span className="profile-control-label">Priority</span>
                    <input type="number" className="profile-input" value={game.priority} onChange={(e) => updateGameField(game.id, 'priority', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="profile-control-item">
                    <span className="profile-control-label">Affinity</span>
                    <input type="text" className="profile-input" value={game.affinity} onChange={(e) => updateGameField(game.id, 'affinity', e.target.value)} />
                  </div>
                </div>

                <div className="thread-section">
                  <div className="thread-section-header">
                    <h4>Thread Configurations</h4>
                    <button className="add-btn small" onClick={() => { setNewThread({ name: '', priority: 0, affinity: 'ALL', disableBoost: false }); setShowAddThread(game.id); }}>
                      <Plus size={14} />
                      Add Thread
                    </button>
                  </div>

                  {/* Add Thread Modal */}
                  {showAddThread === game.id && (
                    <Modal title={`Add Thread — ${game.name}`} onClose={() => setShowAddThread(null)}>
                      <div className="modal-form">
                        <div className="modal-field">
                          <label>Thread Name</label>
                          <input type="text" className="profile-input full-width" placeholder="RenderThread 0" value={newThread.name} onChange={(e) => setNewThread({ ...newThread, name: e.target.value })} />
                        </div>
                        <div className="modal-field-row">
                          <div className="modal-field">
                            <label>Priority</label>
                            <input type="number" className="profile-input" value={newThread.priority} onChange={(e) => setNewThread({ ...newThread, priority: e.target.value })} />
                          </div>
                          <div className="modal-field">
                            <label>Affinity</label>
                            <input type="text" className="profile-input" value={newThread.affinity} onChange={(e) => setNewThread({ ...newThread, affinity: e.target.value })} />
                          </div>
                        </div>
                        <div className="modal-field">
                          <label className="checkbox-label">
                            <input type="checkbox" className="table-checkbox" checked={newThread.disableBoost} onChange={(e) => setNewThread({ ...newThread, disableBoost: e.target.checked })} />
                            Disable Priority Boost
                          </label>
                        </div>
                        <div className="modal-actions">
                          <button className="modal-cancel-btn" onClick={() => setShowAddThread(null)}>Cancel</button>
                          <button className="modal-submit-btn" onClick={() => addThread(game.id)}>Add Thread</button>
                        </div>
                      </div>
                    </Modal>
                  )}

                  <table className="thread-table">
                    <thead>
                      <tr>
                        <th>Thread Name</th>
                        <th>Priority</th>
                        <th>Affinity</th>
                        <th>Disable Boost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.threads.length === 0 && (
                        <tr><td colSpan="5" className="empty-row">No thread configurations</td></tr>
                      )}
                      {game.threads.map((t, i) => (
                        <tr key={i}>
                          <td>{t.name}</td>
                          <td>
                            <input type="number" className="inline-input" value={t.priority} onChange={(e) => updateThread(game.id, i, 'priority', parseInt(e.target.value) || 0)} />
                          </td>
                          <td>
                            <input type="text" className="inline-input" value={t.affinity} onChange={(e) => updateThread(game.id, i, 'affinity', e.target.value)} />
                          </td>
                          <td>
                            <input type="checkbox" className="table-checkbox" checked={t.disableBoost} onChange={(e) => updateThread(game.id, i, 'disableBoost', e.target.checked)} />
                          </td>
                          <td>
                            <button className="delete-btn" onClick={() => removeThread(game.id, i)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className="remove-game-btn" onClick={() => removeGame(game.id)}>
                  <Trash2 size={14} />
                  Remove Game
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   TAB 5: BACKGROUND PROCESSES  (fully wired)
   ============================================================ */
const BackgroundProcesses = ({ config, onConfigChange, addToast }) => {
  const processes = config?.backgroundProcesses || [];
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [showAddThread, setShowAddThread] = useState(null); // procId or null
  const [newProcess, setNewProcess] = useState({ name: '', priority: -15, affinity: 'ALL', disableBoost: true });
  const [newThread, setNewThread] = useState({ name: '', priority: -15, affinity: 'ALL', disableBoost: true });

  const addProcess = () => {
    if (!newProcess.name.trim()) {
      addToast('Process name is required', 'error');
      return;
    }
    const id = newProcess.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `proc_${Date.now()}`;
    onConfigChange({
      ...config,
      backgroundProcesses: [...processes, {
        id,
        name: newProcess.name.trim(),
        priority: parseInt(newProcess.priority) || -15,
        affinity: newProcess.affinity || 'ALL',
        disableBoost: newProcess.disableBoost,
        threads: [],
      }]
    });
    setNewProcess({ name: '', priority: -15, affinity: 'ALL', disableBoost: true });
    setShowAddProcess(false);
    addToast(`Added process: ${newProcess.name.trim()}`, 'success');
  };

  const removeProcess = (id) => {
    const proc = processes.find(p => p.id === id);
    onConfigChange({
      ...config,
      backgroundProcesses: processes.filter(p => p.id !== id)
    });
    addToast(`Removed process: ${proc?.name || id}`, 'success');
  };

  const updateProcessField = (procId, field, value) => {
    onConfigChange({
      ...config,
      backgroundProcesses: processes.map(p => p.id === procId ? { ...p, [field]: value } : p)
    });
  };

  const addThread = (procId) => {
    if (!newThread.name.trim()) {
      addToast('Thread name is required', 'error');
      return;
    }
    onConfigChange({
      ...config,
      backgroundProcesses: processes.map(p => {
        if (p.id !== procId) return p;
        return {
          ...p,
          threads: [...p.threads, {
            name: newThread.name.trim(),
            priority: parseInt(newThread.priority) || -15,
            affinity: newThread.affinity || 'ALL',
            disableBoost: newThread.disableBoost,
          }]
        };
      })
    });
    setNewThread({ name: '', priority: -15, affinity: 'ALL', disableBoost: true });
    setShowAddThread(null);
    addToast(`Added thread: ${newThread.name.trim()}`, 'success');
  };

  const removeThread = (procId, threadIdx) => {
    onConfigChange({
      ...config,
      backgroundProcesses: processes.map(p => {
        if (p.id !== procId) return p;
        return { ...p, threads: p.threads.filter((_, i) => i !== threadIdx) };
      })
    });
  };

  const updateThread = (procId, threadIdx, field, value) => {
    onConfigChange({
      ...config,
      backgroundProcesses: processes.map(p => {
        if (p.id !== procId) return p;
        return {
          ...p,
          threads: p.threads.map((t, i) => i === threadIdx ? { ...t, [field]: value } : t)
        };
      })
    });
  };

  return (
    <div className="content-area">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Background Processes</h1>
          <p className="page-subtitle">Manage priority settings for background applications to reduce interference.</p>
        </div>
        <button className="add-btn" onClick={() => setShowAddProcess(true)}>
          <Plus size={16} />
          Add Process
        </button>
      </div>

      {/* Add Process Modal */}
      {showAddProcess && (
        <Modal title="Add Background Process" onClose={() => setShowAddProcess(false)}>
          <div className="modal-form">
            <div className="modal-field">
              <label>Process Name (e.g., AppName.exe)</label>
              <input type="text" className="profile-input full-width" placeholder="AppName.exe" value={newProcess.name} onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })} />
            </div>
            <div className="modal-field-row">
              <div className="modal-field">
                <label>Priority</label>
                <input type="number" className="profile-input" value={newProcess.priority} onChange={(e) => setNewProcess({ ...newProcess, priority: e.target.value })} />
              </div>
              <div className="modal-field">
                <label>Affinity</label>
                <input type="text" className="profile-input" value={newProcess.affinity} onChange={(e) => setNewProcess({ ...newProcess, affinity: e.target.value })} />
              </div>
            </div>
            <div className="modal-field">
              <label className="checkbox-label">
                <input type="checkbox" className="table-checkbox" checked={newProcess.disableBoost} onChange={(e) => setNewProcess({ ...newProcess, disableBoost: e.target.checked })} />
                Disable Priority Boost
              </label>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowAddProcess(false)}>Cancel</button>
              <button className="modal-submit-btn" onClick={addProcess}>Add Process</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="profile-list">
        {processes.map(proc => (
          <div key={proc.id} className="profile-card">
            <div className="profile-card-header bg-header">
              <div className="profile-header-info">
                <h4>{proc.name}</h4>
                <span className="profile-meta">Priority: <strong>{proc.priority}</strong> • Affinity: {proc.affinity}</span>
              </div>
              <button className="delete-btn" onClick={() => removeProcess(proc.id)}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="profile-card-expanded">
              <div className="profile-controls">
                <div className="profile-control-item">
                  <span className="profile-control-label">Priority</span>
                  <input type="number" className="profile-input" value={proc.priority} onChange={(e) => updateProcessField(proc.id, 'priority', parseInt(e.target.value) || 0)} />
                </div>
                <div className="profile-control-item">
                  <span className="profile-control-label">Affinity</span>
                  <input type="text" className="profile-input" value={proc.affinity} onChange={(e) => updateProcessField(proc.id, 'affinity', e.target.value)} />
                </div>
                <div className="profile-control-item">
                  <span className="profile-control-label">Disable Boost</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={proc.disableBoost} onChange={(e) => updateProcessField(proc.id, 'disableBoost', e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="thread-section">
                <div className="thread-section-header">
                  <h4>Thread Configurations</h4>
                  <button className="add-btn small" onClick={() => { setNewThread({ name: '', priority: -15, affinity: 'ALL', disableBoost: true }); setShowAddThread(proc.id); }}>
                    <Plus size={14} />
                    Add Thread
                  </button>
                </div>

                {/* Add Thread Modal */}
                {showAddThread === proc.id && (
                  <Modal title={`Add Thread — ${proc.name}`} onClose={() => setShowAddThread(null)}>
                    <div className="modal-form">
                      <div className="modal-field">
                        <label>Thread Name</label>
                        <input type="text" className="profile-input full-width" placeholder="CrBrowserMain" value={newThread.name} onChange={(e) => setNewThread({ ...newThread, name: e.target.value })} />
                      </div>
                      <div className="modal-field-row">
                        <div className="modal-field">
                          <label>Priority</label>
                          <input type="number" className="profile-input" value={newThread.priority} onChange={(e) => setNewThread({ ...newThread, priority: e.target.value })} />
                        </div>
                        <div className="modal-field">
                          <label>Affinity</label>
                          <input type="text" className="profile-input" value={newThread.affinity} onChange={(e) => setNewThread({ ...newThread, affinity: e.target.value })} />
                        </div>
                      </div>
                      <div className="modal-field">
                        <label className="checkbox-label">
                          <input type="checkbox" className="table-checkbox" checked={newThread.disableBoost} onChange={(e) => setNewThread({ ...newThread, disableBoost: e.target.checked })} />
                          Disable Priority Boost
                        </label>
                      </div>
                      <div className="modal-actions">
                        <button className="modal-cancel-btn" onClick={() => setShowAddThread(null)}>Cancel</button>
                        <button className="modal-submit-btn" onClick={() => addThread(proc.id)}>Add Thread</button>
                      </div>
                    </div>
                  </Modal>
                )}

                <table className="thread-table">
                  <thead>
                    <tr>
                      <th>Thread Name</th>
                      <th>Priority</th>
                      <th>Affinity</th>
                      <th>Disable Boost</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proc.threads.length === 0 && (
                      <tr><td colSpan="5" className="empty-row"></td></tr>
                    )}
                    {proc.threads.map((t, i) => (
                      <tr key={i}>
                        <td>{t.name}</td>
                        <td>
                          <input type="number" className="inline-input" value={t.priority} onChange={(e) => updateThread(proc.id, i, 'priority', parseInt(e.target.value) || 0)} />
                        </td>
                        <td>
                          <input type="text" className="inline-input" value={t.affinity} onChange={(e) => updateThread(proc.id, i, 'affinity', e.target.value)} />
                        </td>
                        <td>
                          <input type="checkbox" className="table-checkbox" checked={t.disableBoost} onChange={(e) => updateThread(proc.id, i, 'disableBoost', e.target.checked)} />
                        </td>
                        <td>
                          <button className="delete-btn" onClick={() => removeThread(proc.id, i)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   CONSOLE OUTPUT — Terminal-style log matching LUMIN_PULSE.exe
   ============================================================ */
const PULSE_ASCII = `::::::::  :::    ::: :::     :::::::::: :::::::::
:+:       :+:   :+:  :+: :+:   :+:        :+:
+:+       +:+  +:+   +:+ +:+    +:+        +:+
+##+:++#++ #+#  +#+ +#+     +#++:+:+#++ +#++:++#+
#+#        #+#  +#+ +#+             +#+ +#+   #+#
#+#        #+#  #+# #+# #+#        #+   #+    #+
###        ########  ######### ######## #########`;

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const ConsoleOutput = ({ lines, consoleEndRef }) => (
  <div className="console-area">
    <div className="console-output">
      {lines.map((line, i) => (
        <div key={i} className={`console-line ${line.type || ''}`}>
          {line.text}
        </div>
      ))}
      <div ref={consoleEndRef} />
    </div>
  </div>
);

/* ============================================================
   MAIN APP
   ============================================================ */
function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [pulseStatus, setPulseStatus] = useState('STOPPED');
  const [lastResults, setLastResults] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [consoleLines, setConsoleLines] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const consoleEndRef = useRef(null);
  const stopRef = useRef(false);

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLines]);

  // Load config from backend on mount (falls back to DEFAULT_CONFIG)
  useEffect(() => {
    (async () => {
      try {
        const cfg = await invoke('read_config');
        if (cfg) setConfig(cfg);
      } catch (e) {
        console.log('Config load (browser mode):', e);
      }
    })();
  }, []);

  // Save config to backend whenever it changes
  const handleConfigChange = useCallback(async (newConfig) => {
    setConfig(newConfig);
    try {
      await invoke('write_config', { config: newConfig });
    } catch (e) {
      console.log('Config save:', e);
    }
  }, []);

  // Toast helper
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Console log helper ──────────────────────────────────────
  const addLine = useCallback((text, type = '') => {
    setConsoleLines(prev => [...prev, { text, type }]);
  }, []);

  const addLines = useCallback((items) => {
    setConsoleLines(prev => [...prev, ...items.map(item =>
      typeof item === 'string' ? { text: item, type: '' } : item
    )]);
  }, []);

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // ─── Start Pulse — REAL process scanning + optimization ──────
  const handleStartPulse = async () => {
    setPulseStatus('RUNNING');
    setConsoleLines([]);
    stopRef.current = false;

    // Spawn the external console window via Rust backend
    try {
      await invoke('spawn_console_window');
    } catch (e) {
      console.log('Console spawn:', e);
    }

    // Also call the real backend optimization session
    try {
      const results = await invoke('start_optimization_session');
      if (results) {
        setLastResults(results);
      }
    } catch (e) {
      console.log('Optimization session:', e);
    }

    // The rest of the original handleStartPulse console simulation is no longer needed
    // since the console now runs in an external window.
    // The main GUI stays on Dashboard and shows RUNNING status.
  };

  // ─── Stop Pulse (manual) ─────────────────────────────────────
  const handleStopPulse = async () => {
    stopRef.current = true;

    addLine('');
    addLine('========================================', 'con-dim');
    addLine(`[ PULSE ] | ${getTimestamp()} | STOPPED :: User requested stop`, 'con-yellow');
    addLine('========================================', 'con-dim');
    await delay(300);

    addLine('');
    addLine(`[ PULSE ] | ${getTimestamp()} | REVERTING :: Restoring system to standard state...`, 'con-magenta');
    addLine(`[ PULSE ] | ${getTimestamp()} | REVERTING :: Restoring background applications...`, 'con-magenta');
    await delay(400);
    const bgCount = config?.backgroundProcesses?.length || 36;
    addLine(`[ PULSE ] | ${getTimestamp()} | COMPLETE :: Restored ${bgCount} processes (CPU, Memory, Affinity, Power)`, 'con-green');
    addLine(`[ PULSE ] | ${getTimestamp()} | REVERTING :: Restoring Desktop Window Manager to defaults...`, 'con-magenta');
    await delay(300);
    addLine(`[ PULSE ] | ${getTimestamp()} | COMPLETE :: Restored 2 DWM thread(s) to default settings`, 'con-green');
    await delay(300);

    addLine('');
    addLine(`[ PULSE ] | ${getTimestamp()} | STANDBY :: System returned to idle.`, 'con-yellow');

    try {
      await invoke('stop_optimization_session');
    } catch (e) {
      console.log('Stop:', e);
      if (isTauriMode) {
        addToast(`Stop error: ${e}`, 'error');
      }
    }
    setPulseStatus('STOPPED');
  };

  // ─── Window Controls (Tauri) ─────────────────────────────────
  const handleMinimize = async () => {
    try {
      await invoke('window_minimize');
    } catch (e) { 
      console.error('Minimize error:', e);
    }
  };

  const handleClose = async () => {
    try {
      // Force-exit via Rust backend — reverts optimizations and kills the process
      // This guarantees no zombie white-screen window remains
      await invoke('force_exit');
    } catch (e) {
      console.error('Close error on force_exit:', e);
      // Fallback: try Tauri window close API
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (e2) {
        console.error('Close error on api/window:', e2);
        // Browser mode — try window.close
        try { window.close(); } catch { /* ignored */ }
      }
    }
  };

  const navItems = [
    { id: 'Dashboard', icon: LayoutDashboard },
    { id: 'General', icon: Settings },
    { id: 'Optimization', icon: Zap },
    { id: 'Games', icon: Gamepad2 },
    { id: 'Background', icon: Layers }
  ];

  const headerTitles = {
    Dashboard: 'Dashboard',
    General: 'General Settings',
    Optimization: 'Optimization Settings',
    Games: 'Game Profiles',
    Background: 'Background Processes',
    Console: 'Pulse Console',
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard config={config} pulseStatus={pulseStatus} lastResults={lastResults} />;
      case 'General': return <GeneralSettings config={config} onConfigChange={handleConfigChange} />;
      case 'Optimization': return <OptimizationSettings config={config} onConfigChange={handleConfigChange} />;
      case 'Games': return <GameProfiles config={config} onConfigChange={handleConfigChange} addToast={addToast} />;
      case 'Background': return <BackgroundProcesses config={config} onConfigChange={handleConfigChange} addToast={addToast} />;
      default: return null;
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className={`pulse-logo-icon ${pulseStatus === 'RUNNING' ? 'pulse-glow' : ''}`}>
            <span style={{ color: '#000', fontWeight: 800, fontSize: '16px', fontStyle: 'italic', lineHeight: 1 }}>L</span>
          </div>
          <span className="pulse-logo">Pulse</span>
          {pulseStatus === 'RUNNING' && <span className="pulse-status-dot"></span>}
        </div>

        <div className="nav-links">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(item.id); if (item.id !== 'Console') setShowConsole(false); }}
              >
                <Icon size={18} strokeWidth={1.5} />
                {item.id}
              </div>
            );
          })}
        </div>

        <button
          className={`start-pulse-btn ${pulseStatus === 'RUNNING' ? 'pulse-btn-stop' : ''}`}
          onClick={pulseStatus === 'RUNNING' ? handleStopPulse : handleStartPulse}
        >
          {pulseStatus === 'RUNNING' ? (
            <><Square size={16} fill="currentColor" /> Stop Pulse</>
          ) : (
            <><Play size={16} fill="currentColor" /> Start Pulse</>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="main-header" data-tauri-drag-region>
          <span className="header-title">{headerTitles[activeTab] || activeTab}</span>
          <div className="header-actions" data-tauri-drag-region="false">
            {showConsole && pulseStatus !== 'RUNNING' && (
              <button className="header-icon-btn" data-tauri-drag-region="false" onClick={() => { setShowConsole(false); setActiveTab('Dashboard'); }} title="Close Console">
                <X size={14} />
              </button>
            )}
            <button className="header-icon-btn" data-tauri-drag-region="false" onClick={handleMinimize}><Minus size={16} /></button>
            <button className="header-icon-btn" data-tauri-drag-region="false" onClick={handleClose}><X size={16} /></button>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
