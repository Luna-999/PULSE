use std::fs;
use serde::{Deserialize, Serialize};

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

fn main() {
    let path = dirs::config_dir().unwrap().join("LuminPulse/config.json");
    let data = fs::read_to_string(&path).unwrap();
    let config: Result<AppConfig, _> = serde_json::from_str(&data);
    match config {
        Ok(c) => println!("Parsed: {}", c.optimization.priority_class),
        Err(e) => println!("Parse error: {}", e),
    }
}
