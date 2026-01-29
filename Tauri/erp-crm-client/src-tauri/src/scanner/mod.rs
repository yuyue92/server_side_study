//! 扫码枪模块 - 通过串口对接扫码枪

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScannerError {
    #[error("串口错误: {0}")]
    SerialError(String),
    #[error("扫码枪未连接")]
    NotConnected,
    #[error("配置错误: {0}")]
    ConfigError(String),
}

pub type Result<T> = std::result::Result<T, ScannerError>;

/// 扫码枪配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannerConfig {
    pub enabled: bool,
    pub port: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
}

impl Default for ScannerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            port: String::new(),
            baud_rate: 9600,
            data_bits: 8,
            stop_bits: 1,
            parity: "none".to_string(),
        }
    }
}

/// 扫码结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub barcode: String,
    pub timestamp: String,
}

/// 扫码枪状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannerStatus {
    pub connected: bool,
    pub port: Option<String>,
}

/// 扫码枪管理器
pub struct ScannerManager {
    config: Arc<Mutex<ScannerConfig>>,
    running: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    callback: Arc<Mutex<Option<Box<dyn Fn(ScanResult) + Send + 'static>>>>,
}

impl ScannerManager {
    pub fn new() -> Self {
        Self {
            config: Arc::new(Mutex::new(ScannerConfig::default())),
            running: Arc::new(AtomicBool::new(false)),
            connected: Arc::new(AtomicBool::new(false)),
            callback: Arc::new(Mutex::new(None)),
        }
    }

    /// 获取可用串口列表
    pub fn list_ports() -> Result<Vec<String>> {
        let ports = serialport::available_ports()
            .map_err(|e| ScannerError::SerialError(e.to_string()))?;

        Ok(ports.into_iter().map(|p| p.port_name).collect())
    }

    /// 设置扫码回调
    pub fn set_callback<F>(&self, callback: F)
    where
        F: Fn(ScanResult) + Send + 'static,
    {
        let mut cb = self.callback.lock().unwrap();
        *cb = Some(Box::new(callback));
    }

    /// 连接扫码枪
    pub fn connect(&self, config: ScannerConfig) -> Result<()> {
        if self.running.load(Ordering::Relaxed) {
            self.disconnect()?;
        }

        // 保存配置
        {
            let mut cfg = self.config.lock().unwrap();
            *cfg = config.clone();
        }

        // 打开串口
        let port = serialport::new(&config.port, config.baud_rate)
            .timeout(Duration::from_millis(100))
            .open()
            .map_err(|e| ScannerError::SerialError(format!("打开串口失败: {}", e)))?;

        self.running.store(true, Ordering::Relaxed);
        self.connected.store(true, Ordering::Relaxed);

        // 启动读取线程
        let running = Arc::clone(&self.running);
        let connected = Arc::clone(&self.connected);
        let callback = Arc::clone(&self.callback);

        thread::spawn(move || {
            let reader = BufReader::new(port);

            for line in reader.lines() {
                if !running.load(Ordering::Relaxed) {
                    break;
                }

                match line {
                    Ok(barcode) => {
                        let barcode = barcode.trim().to_string();
                        if !barcode.is_empty() {
                            let result = ScanResult {
                                barcode,
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };

                            if let Some(ref cb) = *callback.lock().unwrap() {
                                cb(result);
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("读取扫码数据失败: {}", e);
                        if e.kind() == std::io::ErrorKind::TimedOut {
                            continue;
                        }
                        break;
                    }
                }
            }

            connected.store(false, Ordering::Relaxed);
            running.store(false, Ordering::Relaxed);
        });

        Ok(())
    }

    /// 断开扫码枪
    pub fn disconnect(&self) -> Result<()> {
        self.running.store(false, Ordering::Relaxed);
        self.connected.store(false, Ordering::Relaxed);
        Ok(())
    }

    /// 获取连接状态
    pub fn get_status(&self) -> ScannerStatus {
        let connected = self.connected.load(Ordering::Relaxed);
        let port = if connected {
            self.config.lock().ok().map(|c| c.port.clone())
        } else {
            None
        };

        ScannerStatus { connected, port }
    }

    /// 是否已连接
    pub fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }
}

impl Default for ScannerManager {
    fn default() -> Self {
        Self::new()
    }
}

// 模拟扫码（用于测试和开发）
pub fn simulate_scan(barcode: &str) -> ScanResult {
    ScanResult {
        barcode: barcode.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_ports() {
        let ports = ScannerManager::list_ports();
        assert!(ports.is_ok());
    }

    #[test]
    fn test_scanner_status() {
        let manager = ScannerManager::new();
        let status = manager.get_status();
        assert!(!status.connected);
    }
}
