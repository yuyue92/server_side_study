use reqwest::{header::HeaderMap, Client, Method};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use thiserror::Error;

/// HTTP 请求错误类型
#[derive(Error, Debug)]
pub enum HttpError {
    #[error("请求失败: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("无效的 HTTP 方法: {0}")]
    InvalidMethod(String),

    #[error("URL 解析错误: {0}")]
    UrlParseError(String),

    #[error("超时")]
    Timeout,

    #[error("JSON 解析错误: {0}")]
    JsonError(#[from] serde_json::Error),
}

impl Serialize for HttpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 响应数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseData {
    pub status: u16,
    #[serde(rename = "statusText")]
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    #[serde(rename = "bodySize")]
    pub body_size: usize,
    pub duration: u64,
    pub timestamp: u64,
    pub error: Option<String>,
}

/// 发送 HTTP 请求
#[tauri::command]
pub async fn send_http_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    timeout: u64,
    follow_redirects: bool,
    verify_ssl: bool,
) -> Result<ResponseData, HttpError> {
    let start = std::time::Instant::now();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    // 解析 HTTP 方法
    let method = match method.to_uppercase().as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "DELETE" => Method::DELETE,
        "PATCH" => Method::PATCH,
        "HEAD" => Method::HEAD,
        "OPTIONS" => Method::OPTIONS,
        other => return Err(HttpError::InvalidMethod(other.to_string())),
    };

    // 构建客户端
    let client = Client::builder()
        .timeout(Duration::from_millis(timeout))
        .redirect(if follow_redirects {
            reqwest::redirect::Policy::limited(10)
        } else {
            reqwest::redirect::Policy::none()
        })
        .danger_accept_invalid_certs(!verify_ssl)
        .gzip(true)
        .brotli(true)
        .build()?;

    // 构建请求头
    let mut header_map = HeaderMap::new();
    for (key, value) in &headers {
        if let (Ok(name), Ok(val)) = (
            key.parse::<reqwest::header::HeaderName>(),
            value.parse::<reqwest::header::HeaderValue>(),
        ) {
            header_map.insert(name, val);
        }
    }

    // 构建请求
    let mut request = client.request(method, &url).headers(header_map);

    // 添加请求体
    if let Some(body_content) = body {
        request = request.body(body_content);
    }

    // 发送请求
    let response = request.send().await?;

    // 获取响应信息
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // 获取响应头
    let mut response_headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            response_headers.insert(key.to_string(), v.to_string());
        }
    }

    // 获取响应体
    let body_bytes = response.bytes().await?;
    let body_size = body_bytes.len();
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    let duration = start.elapsed().as_millis() as u64;

    Ok(ResponseData {
        status,
        status_text,
        headers: response_headers,
        body,
        body_size,
        duration,
        timestamp,
        error: None,
    })
}

/// 测试连接
#[tauri::command]
pub async fn test_connection(url: String) -> Result<bool, HttpError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()?;

    let response = client.head(&url).send().await;
    Ok(response.is_ok())
}
