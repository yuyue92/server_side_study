use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::Rng;
use sha2::{Digest, Sha256};
use thiserror::Error;

/// 加密错误类型
#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("加密失败")]
    EncryptionError,

    #[error("解密失败")]
    DecryptionError,

    #[error("密钥长度错误")]
    InvalidKeyLength,

    #[error("Base64 解码错误")]
    Base64Error,
}

/// 从密码派生密钥
pub fn derive_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// AES-256-GCM 加密
pub fn encrypt_aes_gcm(plaintext: &str, password: &str) -> Result<String, CryptoError> {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| CryptoError::InvalidKeyLength)?;

    // 生成随机 nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 加密
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| CryptoError::EncryptionError)?;

    // 组合 nonce + ciphertext 并编码为 base64
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);

    Ok(BASE64.encode(result))
}

/// AES-256-GCM 解密
pub fn decrypt_aes_gcm(ciphertext: &str, password: &str) -> Result<String, CryptoError> {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| CryptoError::InvalidKeyLength)?;

    // 解码 base64
    let data = BASE64
        .decode(ciphertext)
        .map_err(|_| CryptoError::Base64Error)?;

    if data.len() < 12 {
        return Err(CryptoError::DecryptionError);
    }

    // 分离 nonce 和 ciphertext
    let nonce = Nonce::from_slice(&data[..12]);
    let encrypted = &data[12..];

    // 解密
    let plaintext = cipher
        .decrypt(nonce, encrypted)
        .map_err(|_| CryptoError::DecryptionError)?;

    String::from_utf8(plaintext).map_err(|_| CryptoError::DecryptionError)
}

/// 计算 SHA256 哈希
pub fn sha256_hash(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// 生成随机字符串
pub fn generate_random_string(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();

    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let plaintext = "Hello, World!";
        let password = "secret_password";

        let encrypted = encrypt_aes_gcm(plaintext, password).unwrap();
        let decrypted = decrypt_aes_gcm(&encrypted, password).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_sha256() {
        let hash = sha256_hash("test");
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_random_string() {
        let random = generate_random_string(32);
        assert_eq!(random.len(), 32);
    }
}
