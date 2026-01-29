//! 加密存储模块 - 使用 AES-256-GCM 加密本地数据

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{rngs::OsRng, RngCore};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("加密失败: {0}")]
    EncryptionError(String),
    #[error("解密失败: {0}")]
    DecryptionError(String),
    #[error("IO 错误: {0}")]
    IoError(#[from] std::io::Error),
    #[error("密钥派生失败: {0}")]
    KeyDerivationError(String),
}

pub type Result<T> = std::result::Result<T, StorageError>;

/// 加密存储管理器
pub struct SecureStorage {
    data_dir: PathBuf,
    cipher: Option<Aes256Gcm>,
}

impl SecureStorage {
    /// 创建新的加密存储实例
    pub fn new(data_dir: PathBuf) -> Self {
        fs::create_dir_all(&data_dir).ok();
        Self {
            data_dir,
            cipher: None,
        }
    }

    /// 使用密码初始化加密器
    pub fn init_with_password(&mut self, password: &str) -> Result<()> {
        let key = self.derive_key(password)?;
        self.cipher = Some(Aes256Gcm::new_from_slice(&key).map_err(|e| {
            StorageError::EncryptionError(format!("创建加密器失败: {}", e))
        })?);
        Ok(())
    }

    /// 使用 Argon2 派生密钥
    fn derive_key(&self, password: &str) -> Result<[u8; 32]> {
        // 使用固定的 salt（生产环境应该为每个用户生成唯一的 salt）
        let salt = SaltString::from_b64("c2FsdHlzYWx0c2FsdHk")
            .map_err(|e| StorageError::KeyDerivationError(format!("Salt 错误: {}", e)))?;

        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| StorageError::KeyDerivationError(format!("哈希失败: {}", e)))?;

        let hash_output = hash.hash.ok_or_else(|| {
            StorageError::KeyDerivationError("获取哈希输出失败".to_string())
        })?;

        let bytes = hash_output.as_bytes();
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes[..32]);
        Ok(key)
    }

    /// 加密数据
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>> {
        let cipher = self.cipher.as_ref().ok_or_else(|| {
            StorageError::EncryptionError("加密器未初始化".to_string())
        })?;

        // 生成随机 nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // 加密
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| StorageError::EncryptionError(format!("加密失败: {}", e)))?;

        // 组合 nonce + ciphertext
        let mut result = nonce_bytes.to_vec();
        result.extend(ciphertext);
        Ok(result)
    }

    /// 解密数据
    pub fn decrypt(&self, encrypted: &[u8]) -> Result<Vec<u8>> {
        let cipher = self.cipher.as_ref().ok_or_else(|| {
            StorageError::DecryptionError("加密器未初始化".to_string())
        })?;

        if encrypted.len() < 12 {
            return Err(StorageError::DecryptionError("数据长度不足".to_string()));
        }

        // 分离 nonce 和 ciphertext
        let (nonce_bytes, ciphertext) = encrypted.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // 解密
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| StorageError::DecryptionError(format!("解密失败: {}", e)))
    }

    /// 存储加密数据到文件
    pub fn set(&self, key: &str, value: &str) -> Result<()> {
        let encrypted = self.encrypt(value.as_bytes())?;
        let encoded = BASE64.encode(&encrypted);
        let file_path = self.data_dir.join(format!("{}.enc", key));
        fs::write(file_path, encoded)?;
        Ok(())
    }

    /// 从文件读取并解密数据
    pub fn get(&self, key: &str) -> Result<Option<String>> {
        let file_path = self.data_dir.join(format!("{}.enc", key));
        if !file_path.exists() {
            return Ok(None);
        }

        let encoded = fs::read_to_string(file_path)?;
        let encrypted = BASE64
            .decode(encoded.trim())
            .map_err(|e| StorageError::DecryptionError(format!("Base64 解码失败: {}", e)))?;

        let decrypted = self.decrypt(&encrypted)?;
        let value = String::from_utf8(decrypted)
            .map_err(|e| StorageError::DecryptionError(format!("UTF-8 解码失败: {}", e)))?;

        Ok(Some(value))
    }

    /// 删除加密数据
    pub fn delete(&self, key: &str) -> Result<()> {
        let file_path = self.data_dir.join(format!("{}.enc", key));
        if file_path.exists() {
            fs::remove_file(file_path)?;
        }
        Ok(())
    }

    /// 清除所有加密数据
    pub fn clear(&self) -> Result<()> {
        for entry in fs::read_dir(&self.data_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "enc") {
                fs::remove_file(path)?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_encrypt_decrypt() {
        let dir = tempdir().unwrap();
        let mut storage = SecureStorage::new(dir.path().to_path_buf());
        storage.init_with_password("test_password").unwrap();

        let plaintext = "Hello, World!";
        let encrypted = storage.encrypt(plaintext.as_bytes()).unwrap();
        let decrypted = storage.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.as_bytes(), decrypted.as_slice());
    }

    #[test]
    fn test_set_get() {
        let dir = tempdir().unwrap();
        let mut storage = SecureStorage::new(dir.path().to_path_buf());
        storage.init_with_password("test_password").unwrap();

        storage.set("test_key", "test_value").unwrap();
        let value = storage.get("test_key").unwrap();

        assert_eq!(value, Some("test_value".to_string()));
    }
}
