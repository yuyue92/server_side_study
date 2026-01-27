use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// 导出错误类型
#[derive(Error, Debug)]
pub enum ExportError {
    #[error("序列化错误: {0}")]
    SerializeError(#[from] serde_json::Error),

    #[error("文件操作错误: {0}")]
    IoError(#[from] std::io::Error),
}

impl Serialize for ExportError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 请求数据（用于导出）
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestExport {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

/// 生成 cURL 命令
#[tauri::command]
pub fn generate_curl(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> String {
    let mut parts: Vec<String> = vec!["curl".to_string()];

    // 方法
    if method != "GET" {
        parts.push(format!("-X {}", method));
    }

    // URL
    parts.push(format!("'{}'", url));

    // Headers
    for (key, value) in &headers {
        parts.push(format!("-H '{}: {}'", key, value));
    }

    // Body
    if let Some(body_content) = body {
        if !body_content.is_empty() {
            let escaped = body_content.replace('\'', "'\\''");
            parts.push(format!("-d '{}'", escaped));
        }
    }

    parts.join(" \\\n  ")
}

/// 导出为 JSON 格式
#[tauri::command]
pub fn export_as_json(request: RequestExport) -> Result<String, ExportError> {
    let json = serde_json::to_string_pretty(&request)?;
    Ok(json)
}

/// 导出为 Postman 集合格式
#[tauri::command]
pub fn export_as_postman(
    name: String,
    requests: Vec<RequestExport>,
) -> Result<String, ExportError> {
    let postman_collection = serde_json::json!({
        "info": {
            "name": name,
            "_postman_id": uuid_v4(),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": requests.iter().map(|req| {
            serde_json::json!({
                "name": format!("{} {}", req.method, req.url),
                "request": {
                    "method": req.method,
                    "header": req.headers.iter().map(|(k, v)| {
                        serde_json::json!({
                            "key": k,
                            "value": v,
                            "type": "text"
                        })
                    }).collect::<Vec<_>>(),
                    "url": {
                        "raw": req.url,
                        "host": [req.url.clone()]
                    },
                    "body": req.body.as_ref().map(|b| {
                        serde_json::json!({
                            "mode": "raw",
                            "raw": b,
                            "options": {
                                "raw": {
                                    "language": "json"
                                }
                            }
                        })
                    })
                }
            })
        }).collect::<Vec<_>>()
    });

    let json = serde_json::to_string_pretty(&postman_collection)?;
    Ok(json)
}

/// 生成简单的 UUID v4
fn uuid_v4() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        (bytes[6] & 0x0f) | 0x40, bytes[7],
        (bytes[8] & 0x3f) | 0x80, bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}
