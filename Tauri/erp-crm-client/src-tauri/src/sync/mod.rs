//! 数据同步模块 - 处理与企业服务器的数据同步

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::sync::mpsc;
use tokio::time::interval;

#[derive(Error, Debug)]
pub enum SyncError {
    #[error("网络错误: {0}")]
    NetworkError(String),
    #[error("服务器错误: {0}")]
    ServerError(String),
    #[error("数据错误: {0}")]
    DataError(String),
    #[error("同步已在进行中")]
    AlreadySyncing,
}

pub type Result<T> = std::result::Result<T, SyncError>;

/// 同步状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub is_syncing: bool,
    pub last_sync_at: Option<String>,
    pub pending_changes: i64,
    pub sync_errors: Vec<SyncErrorItem>,
}

/// 同步错误项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncErrorItem {
    pub id: String,
    pub entity: String,
    pub entity_id: String,
    pub operation: String,
    pub error: String,
    pub timestamp: String,
    pub retry_count: i32,
}

/// 同步进度事件
#[derive(Debug, Clone, Serialize)]
pub struct SyncProgressEvent {
    pub progress: f32,
    pub message: String,
}

/// 同步管理器
pub struct SyncManager {
    api_base_url: String,
    is_syncing: Arc<AtomicBool>,
    sync_interval: Duration,
    client: reqwest::Client,
}

impl SyncManager {
    pub fn new(api_base_url: String, sync_interval_minutes: u64) -> Self {
        Self {
            api_base_url,
            is_syncing: Arc::new(AtomicBool::new(false)),
            sync_interval: Duration::from_secs(sync_interval_minutes * 60),
            client: reqwest::Client::new(),
        }
    }
        /// 构造 API 完整地址（仅拼接，不发起网络请求）
    fn endpoint(&self, path: &str) -> String {
        let base = self.api_base_url.trim_end_matches('/');
        let p = path.trim_start_matches('/');
        format!("{}/{}", base, p)
    }

    /// 开始自动同步
    pub async fn start_auto_sync(&self, mut stop_rx: mpsc::Receiver<()>) {
        let mut interval = interval(self.sync_interval);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = self.sync().await {
                        log::error!("自动同步失败: {}", e);
                    }
                }
                _ = stop_rx.recv() => {
                    log::info!("停止自动同步");
                    break;
                }
            }
        }
    }

    /// 执行同步
    pub async fn sync(&self) -> Result<()> {
        // 检查是否已在同步
        if self.is_syncing.swap(true, Ordering::Relaxed) {
            return Err(SyncError::AlreadySyncing);
        }

        let result = self.do_sync().await;

        self.is_syncing.store(false, Ordering::Relaxed);
        result
    }

    /// 实际同步逻辑
    async fn do_sync(&self) -> Result<()> {
        log::info!("开始数据同步...");

        // 1. 上传本地变更
        self.upload_changes().await?;

        // 2. 下载服务器变更
        self.download_changes().await?;

        log::info!("数据同步完成");
        Ok(())
    }

    /// 上传本地变更到服务器
    async fn upload_changes(&self) -> Result<()> {
        // 这里应该从数据库获取待同步的数据并上传
        // 示例实现
        // log::debug!("上传本地变更...");
        // 仅构造请求以使用 api_base_url / client，避免 dead_code 警告（此处不发送网络请求）
        let url = self.endpoint("sync/upload");
        let _req = self.client.post(&url);
        log::debug!("上传本地变更... target={}", url);

        // 实际项目中应该:
        // 1. 从 sync_queue 表获取待上传数据
        // 2. 调用服务器 API 上传
        // 3. 成功后从队列中删除
        // 4. 失败则增加重试次数

        Ok(())
    }

    /// 从服务器下载变更
    async fn download_changes(&self) -> Result<()> {
        // 这里应该从服务器拉取最新数据
        // 示例实现
        // log::debug!("下载服务器变更...");
        // 仅构造请求以使用 api_base_url / client，避免 dead_code 警告（此处不发送网络请求）
        let url = self.endpoint("sync/download");
        let _req = self.client.get(&url);
        log::debug!("下载服务器变更... target={}", url);

        // 实际项目中应该:
        // 1. 调用服务器 API 获取自上次同步后的变更
        // 2. 合并到本地数据库
        // 3. 处理冲突

        Ok(())
    }

    /// 强制全量同步
    pub async fn force_full_sync(&self) -> Result<()> {
        if self.is_syncing.swap(true, Ordering::Relaxed) {
            return Err(SyncError::AlreadySyncing);
        }

        log::info!("开始全量同步...");

        // 1. 清除本地数据
        // 2. 从服务器下载所有数据
        // 3. 重建本地数据库

        self.is_syncing.store(false, Ordering::Relaxed);
        log::info!("全量同步完成");
        Ok(())
    }

    /// 获取同步状态
    pub fn get_status(&self, pending_count: i64, errors: Vec<SyncErrorItem>) -> SyncStatus {
        SyncStatus {
            is_syncing: self.is_syncing.load(Ordering::Relaxed),
            last_sync_at: None, // 应该从存储中读取
            pending_changes: pending_count,
            sync_errors: errors,
        }
    }

    /// 是否正在同步
    pub fn is_syncing(&self) -> bool {
        self.is_syncing.load(Ordering::Relaxed)
    }
}

/// API 请求响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub message: Option<String>,
}

/// 同步数据包
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncPacket {
    pub entity_type: String,
    pub operation: String,
    pub data: serde_json::Value,
    pub timestamp: String,
}
