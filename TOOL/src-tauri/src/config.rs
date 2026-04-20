use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Get the config file path: %APPDATA%\LuminPulse\config.json
fn config_path() -> Result<PathBuf, String> {
    let app_data = dirs::config_dir()
        .ok_or_else(|| "Could not find AppData directory".to_string())?;
    let dir = app_data.join("LuminPulse");
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    Ok(dir.join("config.json"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadConfig {
    pub name: String,
    pub priority: i32,
    pub affinity: String,
    #[serde(rename = "disableBoost")]
    pub disable_boost: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameProfile {
    pub id: String,
    pub name: String,
    pub icon: String,
    #[serde(rename = "iconColor")]
    pub icon_color: String,
    pub priority: i32,
    pub affinity: String,
    pub enabled: bool,
    pub threads: Vec<ThreadConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundProcess {
    pub id: String,
    pub name: String,
    pub priority: i32,
    pub affinity: String,
    #[serde(rename = "disableBoost")]
    pub disable_boost: bool,
    pub threads: Vec<ThreadConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(rename = "hideOnStart")]
    pub hide_on_start: bool,
    #[serde(rename = "runOnStartup")]
    pub run_on_startup: bool,
    #[serde(rename = "scanIntervalSeconds")]
    pub scan_interval_seconds: u32,
    #[serde(rename = "gameInitWaitSeconds")]
    pub game_init_wait_seconds: u32,
    #[serde(rename = "reapplyCheckSeconds")]
    pub reapply_check_seconds: u32,
    #[serde(rename = "loggingMode")]
    pub logging_mode: String,
    #[serde(rename = "completionSounds")]
    pub completion_sounds: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationSettings {
    #[serde(rename = "priorityClass")]
    pub priority_class: String,
    #[serde(rename = "backgroundApps")]
    pub background_apps: bool,
    #[serde(rename = "dwmOptimization")]
    pub dwm_optimization: bool,
    #[serde(rename = "smartAffinity")]
    pub smart_affinity: bool,
    #[serde(rename = "cpuSets")]
    pub cpu_sets: bool,
    #[serde(rename = "idealProcessor")]
    pub ideal_processor: bool,
    #[serde(rename = "powerThrottling")]
    pub power_throttling: bool,
    #[serde(rename = "extremePriority")]
    pub extreme_priority: bool,
    #[serde(rename = "proAudioMMCSS")]
    pub pro_audio_mmcss: bool,
    #[serde(rename = "priorityBoost")]
    pub priority_boost: bool,
    #[serde(rename = "threadQoS")]
    pub thread_qos: bool,
    #[serde(rename = "powerRequest")]
    pub power_request: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub general: GeneralSettings,
    pub optimization: OptimizationSettings,
    #[serde(rename = "gameProfiles")]
    pub game_profiles: Vec<GameProfile>,
    #[serde(rename = "backgroundProcesses")]
    pub background_processes: Vec<BackgroundProcess>,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            general: GeneralSettings {
                hide_on_start: false,
                run_on_startup: true,
                scan_interval_seconds: 2,
                game_init_wait_seconds: 30,
                reapply_check_seconds: 30,
                logging_mode: "Normal".to_string(),
                completion_sounds: true,
            },
            optimization: OptimizationSettings {
                priority_class: "HIGH".to_string(),
                background_apps: true,
                dwm_optimization: true,
                smart_affinity: true,
                cpu_sets: true,
                ideal_processor: true,
                power_throttling: true,
                extreme_priority: true,
                pro_audio_mmcss: true,
                priority_boost: true,
                thread_qos: true,
                power_request: true,
            },
            game_profiles: vec![
                GameProfile {
                    id: "fortnite".to_string(),
                    name: "FortniteClient-Win64-Shipping.exe".to_string(),
                    icon: "FN".to_string(),
                    icon_color: "#3b82f6".to_string(),
                    priority: 0,
                    affinity: "ALL".to_string(),
                    enabled: true,
                    threads: vec![
                        ThreadConfig { name: "RenderThread 0".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "RHIThread".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "GameThread".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "AudioMixerRenderThread(2)".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "RtcNetworkThread".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "RtcWorkerThread".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "FAsyncLoadingThread".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ],
                },
                GameProfile {
                    id: "valorant".to_string(),
                    name: "VALORANT-Win64-Shipping.exe".to_string(),
                    icon: "VL".to_string(),
                    icon_color: "#ef4444".to_string(),
                    priority: 0,
                    affinity: "ALL".to_string(),
                    enabled: true,
                    threads: vec![
                        ThreadConfig { name: "RenderThread 0".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "RHIThread".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "GameThread".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "AudioMixerRenderThread(2)".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "RtcNetworkThread".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "RtcWorkerThread".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "FAsyncLoadingThread".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadHP 0".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadHP 1".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadHP 2".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadHP 3".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadNP 0".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "TaskGraphThreadNP 1".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                    ],
                },
                GameProfile {
                    id: "cs2".to_string(),
                    name: "cs2.exe".to_string(),
                    icon: "CS".to_string(),
                    icon_color: "#f59e0b".to_string(),
                    priority: 0,
                    affinity: "ALL".to_string(),
                    enabled: true,
                    threads: vec![
                        ThreadConfig { name: "RenderThread".into(), priority: 15, affinity: "ALL".into(), disable_boost: false },
                        ThreadConfig { name: "SoundThread".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "NetworkThread".into(), priority: 0, affinity: "ALL".into(), disable_boost: true },
                        ThreadConfig { name: "LoadingThread".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ],
                },
                GameProfile {
                    id: "waterpark".to_string(),
                    name: "WaterparkSimulator.exe".to_string(),
                    icon: "WP".to_string(),
                    icon_color: "#06b6d4".to_string(),
                    priority: 0,
                    affinity: "ALL".to_string(),
                    enabled: true,
                    threads: vec![],
                },
            ],
            background_processes: vec![
                BackgroundProcess { id: "explorer".to_string(), name: "explorer.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "shellexp".to_string(), name: "ShellExperienceHost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "sihost".to_string(), name: "sihost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "ctfmon".to_string(), name: "ctfmon.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "startmenu".to_string(), name: "StartMenuExperienceHost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "searchhost".to_string(), name: "SearchHost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "textinput".to_string(), name: "TextInputHost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "chrome".to_string(), name: "chrome.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![
                    ThreadConfig { name: "CrBrowserMain".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "CrRendererMain".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "Chrome_IOThread".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                ]},
                BackgroundProcess { id: "msedge".to_string(), name: "msedge.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "firefox".to_string(), name: "firefox.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "discord".to_string(), name: "Discord.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![
                    ThreadConfig { name: "AudioRenderThread".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "AudioMixerThread".into(), priority: 2, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "updater-client-worker".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "NetworkService".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                    ThreadConfig { name: "CrBrowserMain".into(), priority: -15, affinity: "ALL".into(), disable_boost: true },
                ]},
                BackgroundProcess { id: "spotify".to_string(), name: "Spotify.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "skype".to_string(), name: "Skype.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "slack".to_string(), name: "Slack.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "teams".to_string(), name: "Teams.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "zoom".to_string(), name: "Zoom.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "obs64".to_string(), name: "obs64.exe".into(), priority: 2, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "medal".to_string(), name: "Medal.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "voicemod".to_string(), name: "Voicemod.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "steam".to_string(), name: "Steam.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "steamweb".to_string(), name: "steamwebhelper.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "riotclient".to_string(), name: "RiotClientServices.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "armourycrate".to_string(), name: "ArmouryCrate.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "steelseries".to_string(), name: "SteelSeriesGG.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "razer".to_string(), name: "Razer Synapse.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "lghub".to_string(), name: "LGHUB.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "corsair".to_string(), name: "CorsairService.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "nvcontainer".to_string(), name: "nvcontainer.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "nvdisplay".to_string(), name: "NVDisplay.Container.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "svchost".to_string(), name: "svchost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "dllhost".to_string(), name: "dllhost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "conhost".to_string(), name: "conhost.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "taskhostw".to_string(), name: "taskhostw.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "trustedinstaller".to_string(), name: "TrustedInstaller.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "tiworker".to_string(), name: "TiWorker.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
                BackgroundProcess { id: "runtimebroker".to_string(), name: "RuntimeBroker.exe".into(), priority: -15, affinity: "ALL".into(), disable_boost: true, threads: vec![] },
            ],
        }
    }
}

/// Read config from disk, or create default if it doesn't exist
pub fn read_config() -> Result<AppConfig, String> {
    let path = config_path()?;
    if !path.exists() {
        let default = AppConfig::default();
        write_config(&default)?;
        return Ok(default);
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    let config: AppConfig = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse config: {}", e))?;
    Ok(config)
}

/// Write config to disk
pub fn write_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path()?;
    let data = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}
