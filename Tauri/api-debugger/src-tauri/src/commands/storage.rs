use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use thiserror::Error;

/// 存储错误类型
#[derive(Error, Debug)]
pub enum StorageError {
    #[error("文件操作错误: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON 解析错误: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("路径错误")]
    PathError,
}

impl Serialize for StorageError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 获取数据目录
fn get_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, StorageError> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|_| StorageError::PathError)?;

    if !path.exists() {
        fs::create_dir_all(&path)?;
    }

    Ok(path)
}

/// 保存数据到文件
#[tauri::command]
pub async fn save_data(
    app: tauri::AppHandle,
    filename: String,
    data: String,
) -> Result<(), StorageError> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join(filename);

    fs::write(file_path, data)?;
    Ok(())
}

/// 从文件加载数据
#[tauri::command]
pub async fn load_data(app: tauri::AppHandle, filename: String) -> Result<String, StorageError> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join(filename);

    if !file_path.exists() {
        return Ok(String::new());
    }

    let content = fs::read_to_string(file_path)?;
    Ok(content)
}

/// 删除数据文件
#[tauri::command]
pub async fn delete_data(app: tauri::AppHandle, filename: String) -> Result<(), StorageError> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join(filename);

    if file_path.exists() {
        fs::remove_file(file_path)?;
    }

    Ok(())
}

/// 列出所有数据文件
#[tauri::command]
pub async fn list_data_files(app: tauri::AppHandle) -> Result<Vec<String>, StorageError> {
    let data_dir = get_data_dir(&app)?;

    let mut files = Vec::new();

    for entry in fs::read_dir(data_dir)? {
        let entry = entry?;
        if let Some(name) = entry.file_name().to_str() {
            files.push(name.to_string());
        }
    }

    Ok(files)
}
