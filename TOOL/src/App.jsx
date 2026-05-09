import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Settings, Zap, Gamepad2, Layers, Play, Square, Plus, ChevronDown, ChevronUp, Trash2, Minus, X, CheckCircle, AlertCircle, Terminal } from 'lucide-react';
import './index.css';

// ─── Tauri Bridge ─────────────────────────────────────────────────
let invoke = async (cmd, args) => {
  console.log(`[mock] invoke('${cmd}')`, args);
  return null;
};

let listen = async (event, handler) => {
  console.log(`[mock] listening for ${event}`);
  return () => {};
};

let isTauriMode = false;

const initTauri = async () => {
  try {
    const tauri = await import('@tauri-apps/api/core');
    const event = await import('@tauri-apps/api/event');
    invoke = tauri.invoke;
    listen = event.listen;
    isTauriMode = true;
    console.log('[Pulse] Tauri backend connected');
  } catch {
    console.log('[Pulse] Running in browser mode (no backend)');
  }
};
initTauri();

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
      threads: [],
    },
  ],
  backgroundProcesses: [
    { id: 'explorer', name: 'explorer.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'chrome', name: 'chrome.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
    { id: 'discord', name: 'Discord.exe', priority: -15, affinity: 'ALL', disableBoost: true, threads: [] },
  ],
};

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

const GeneralSettings = ({ config, onConfigChange }) => {
  const general = config?.general || {};
  const updateField = (field, value) => {
    onConfigChange({ ...config, general: { ...general, [field]: value } });
    if (field === 'runOnStartup') {
      invoke('set_autostart', { enabled: value });
    }
  };

  return (
    <div className="content-area">
      <h1 className="page-title">General Settings</h1>
      <p className="page-subtitle">Configure basic application behavior and monitoring intervals.</p>
      <div className="settings-card">
        <div className="settings-card-header">Window Settings</div>
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
      </div>
    </div>
  );
};

const Dashboard = ({ config, pulseStatus, lastResults }) => {
  const general = config?.general || {};
  const optimization = config?.optimization || {};
  return (
    <div className="content-area">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of your Pulse configuration and status.</p>
      <div className="status-cards-row">
        <div className="status-card"><div className="status-card-accent accent-blue"></div><div className="status-card-body"><div className="status-card-label">PULSE STATUS</div><span className={`status-badge-pill ${pulseStatus === 'RUNNING' ? 'badge-active' : 'badge-neutral'}`}>{pulseStatus === 'RUNNING' ? '● RUNNING' : '○ NOT RUNNING'}</span><div className="status-card-desc">Main application status</div></div></div>
        <div className="status-card"><div className="status-card-accent accent-orange"></div><div className="status-card-body"><div className="status-card-label">AUTO-START</div><span className={`status-badge-pill ${general.runOnStartup ? 'badge-active' : 'badge-neutral'}`}>{general.runOnStartup ? 'ENABLED' : 'DISABLED'}</span><div className="status-card-desc">Windows startup behavior</div></div></div>
        <div className="status-card"><div className="status-card-accent accent-green"></div><div className="status-card-body"><div className="status-card-label">LICENSE</div><span className="status-badge-pill badge-active">ACTIVE</span><div className="status-card-desc">Subscription active</div></div></div>
      </div>
      <div className="settings-card">
        <div className="settings-card-header">Current Configuration</div>
        <div className="config-grid">
          <div className="config-item"><span className="config-label">Priority Class</span><span className="config-value">{optimization.priorityClass || 'BALANCED'}</span></div>
          <div className="config-item"><span className="config-label">Turbo Mode</span><span className="config-value text-green">{optimization.extremePriority !== false ? 'Enabled' : 'Disabled'}</span></div>
        </div>
      </div>
    </div>
  );
};

const OptimizationToggle = ({ label, desc, checked, onChange }) => (
  <div className="opt-toggle-item"><div className="opt-toggle-info"><h4>{label}</h4><p>{desc}</p></div><label className="toggle-switch"><input type="checkbox" checked={checked} onChange={onChange} /><span className="slider"></span></label></div>
);

const OptimizationSettings = ({ config, onConfigChange }) => {
  const optimization = config?.optimization || {};
  const updateField = (field, value) => onConfigChange({ ...config, optimization: { ...optimization, [field]: value } });
  return (
    <div className="content-area">
      <h1 className="page-title">Optimization Settings</h1>
      <p className="page-subtitle">100% EAC-safe optimizations.</p>
      <div className="settings-card">
        <div className="setting-row">
          <div className="setting-info"><h4>Priority Class</h4></div>
          <select className="custom-select" value={optimization.priorityClass || 'BALANCED'} onChange={(e) => updateField('priorityClass', e.target.value)}>
            <option value="NORMAL">NORMAL</option><option value="BALANCED">BALANCED</option><option value="HIGH">HIGH</option><option value="REALTIME">REALTIME</option>
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
    </div>
  );
};

const GameProfiles = ({ config, onConfigChange, addToast }) => {
  const games = config?.gameProfiles || [];
  const [expandedId, setExpandedId] = useState(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', icon: '', iconColor: '#3b82f6', priority: 0, affinity: 'ALL' });

  const handleBrowse = async () => {
    try {
      const fileName = await invoke('pick_game_exe');
      if (fileName) {
        setNewGame(prev => ({ ...prev, name: fileName, icon: fileName.substring(0, 2).toUpperCase() }));
      }
    } catch (e) { addToast('Failed to open file dialog', 'error'); }
  };

  const addGame = () => {
    if (!newGame.name.trim()) return;
    const id = newGame.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    onConfigChange({ ...config, gameProfiles: [...games, { id, ...newGame, enabled: true, threads: [] }] });
    setShowAddGame(false);
  };

  return (
    <div className="content-area">
      <div className="page-header-row">
        <h1 className="page-title">Game Profiles</h1>
        <button className="add-btn" onClick={() => setShowAddGame(true)}><Plus size={16} /> Add Game</button>
      </div>
      {showAddGame && (
        <Modal title="Add Game Profile" onClose={() => setShowAddGame(false)}>
          <div className="modal-form">
            <div className="modal-field">
              <label>Process Name</label>
              <div className="browse-input-group">
                <input type="text" className="profile-input" style={{ flex: 1 }} value={newGame.name} onChange={(e) => setNewGame({ ...newGame, name: e.target.value })} />
                <button className="browse-btn" onClick={handleBrowse}>Browse...</button>
              </div>
            </div>
            <div className="modal-actions"><button className="modal-submit-btn" onClick={addGame}>Add Game</button></div>
          </div>
        </Modal>
      )}
      <div className="profile-list">
        {games.map(game => (
          <div key={game.id} className="profile-card">
            <div className="profile-card-header" onClick={() => setExpandedId(expandedId === game.id ? null : game.id)}>
              <div className="profile-icon" style={{ backgroundColor: game.iconColor }}>{game.icon}</div>
              <div className="profile-header-info"><h4>{game.name}</h4></div>
              <span className={`active-badge ${!game.enabled ? 'badge-inactive' : ''}`}>{game.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BackgroundProcesses = ({ config, onConfigChange, addToast }) => {
  const processes = config?.backgroundProcesses || [];
  return (
    <div className="content-area">
      <h1 className="page-title">Background Processes</h1>
      <div className="profile-list">
        {processes.map(proc => (
          <div key={proc.id} className="profile-card"><div className="profile-card-header bg-header"><h4>{proc.name}</h4></div></div>
        ))}
      </div>
    </div>
  );
};

const LogsView = ({ logs, logEndRef }) => (
  <div className="content-area">
    <h1 className="page-title">System Logs</h1>
    <p className="page-subtitle">Real-time kernel optimization events and IPC data.</p>
    <div className="logs-container" style={{ background: '#0a0a0a', padding: '20px', borderRadius: '12px', height: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '13px' }}>
      {logs.length === 0 ? <div className="empty-logs">No logs yet. Start Pulse to begin.</div> : logs.map((log, i) => (
        <div key={i} className={`log-entry ${log.level}`} style={{ color: log.level === 'error' ? '#ef4444' : '#d4d4d4', marginBottom: '4px' }}>
          <span className="log-ts">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span className="log-level">[{log.level.toUpperCase()}]</span>
          <span className="log-proc">[{log.process || 'SYSTEM'}]</span>
          <span className="log-msg"> {log.message}</span>
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [config, setConfig] = useState(null);
  const [pulseStatus, setPulseStatus] = useState('STOPPED');
  const [lastResults, setLastResults] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    let unlisten;
    (async () => {
      unlisten = await listen('pulse_log', (event) => {
        setLogs(prev => [...prev, event.payload].slice(-200));
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await invoke('read_config');
        if (cfg) setConfig(cfg);
        const running = await invoke('get_pulse_status');
        setPulseStatus(running ? 'RUNNING' : 'STOPPED');
      } catch { setConfig(DEFAULT_CONFIG); }
    })();
  }, []);

  const handleConfigChange = useCallback(async (newConfig) => {
    setConfig(newConfig);
    try { await invoke('write_config', { config: newConfig }); } catch {}
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleStartPulse = async () => {
    setPulseStatus('RUNNING');
    try {
      await invoke('spawn_console_window');
      const results = await invoke('start_optimization_session');
      if (results) setLastResults(results);
    } catch {}
  };

  const handleStopPulse = async () => {
    try { await invoke('stop_optimization_session'); } catch {}
    setPulseStatus('STOPPED');
  };

  const handleMinimize = async () => { try { await invoke('window_minimize'); } catch {} };
  const handleClose = async () => { try { await invoke('force_exit'); } catch { window.close(); } };

  const navItems = [
    { id: 'Dashboard', icon: LayoutDashboard },
    { id: 'General', icon: Settings },
    { id: 'Optimization', icon: Zap },
    { id: 'Games', icon: Gamepad2 },
    { id: 'Background', icon: Layers },
    { id: 'Logs', icon: Terminal }
  ];

  const renderContent = () => {
    if (!config) return <div className="loading">Loading Pulse...</div>;
    switch (activeTab) {
      case 'Dashboard': return <Dashboard config={config} pulseStatus={pulseStatus} lastResults={lastResults} />;
      case 'General': return <GeneralSettings config={config} onConfigChange={handleConfigChange} />;
      case 'Optimization': return <OptimizationSettings config={config} onConfigChange={handleConfigChange} />;
      case 'Games': return <GameProfiles config={config} onConfigChange={handleConfigChange} addToast={addToast} />;
      case 'Background': return <BackgroundProcesses config={config} onConfigChange={handleConfigChange} addToast={addToast} />;
      case 'Logs': return <LogsView logs={logs} logEndRef={logEndRef} />;
      default: return null;
    }
  };

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <div className="sidebar">
        <div className="sidebar-header">
          <div className={`pulse-logo-icon ${pulseStatus === 'RUNNING' ? 'pulse-glow' : ''}`}><span style={{ color: '#000', fontWeight: 800, fontSize: '16px', fontStyle: 'italic', lineHeight: 1 }}>L</span></div>
          <span className="pulse-logo">Pulse</span>
        </div>
        <div className="nav-links">
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <item.icon size={18} strokeWidth={1.5} />
              {item.id}
            </div>
          ))}
        </div>
        <button className={`start-pulse-btn ${pulseStatus === 'RUNNING' ? 'pulse-btn-stop' : ''}`} onClick={pulseStatus === 'RUNNING' ? handleStopPulse : handleStartPulse}>
          {pulseStatus === 'RUNNING' ? <><Square size={16} fill="currentColor" /> Stop Pulse</> : <><Play size={16} fill="currentColor" /> Start Pulse</>}
        </button>
      </div>
      <div className="main-content">
        <div className="main-header" data-tauri-drag-region>
          <span className="header-title">{activeTab}</span>
          <div className="header-actions">
            <button className="header-icon-btn" onClick={handleMinimize}><Minus size={16} /></button>
            <button className="header-icon-btn" onClick={handleClose}><X size={16} /></button>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
