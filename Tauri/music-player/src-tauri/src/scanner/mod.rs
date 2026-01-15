use lofty::prelude::*;  // ✅ 使用 prelude 导入所有需要的类型
use lofty::probe::Probe;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, serde::Serialize)]
pub struct AudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub duration: Option<f64>,
    pub format: String,
}

pub fn scan_audio_file(path: &str) -> Result<AudioMetadata, String> {
    let tagged_file = Probe::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?
        .read()
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    let properties = tagged_file.properties();
    let duration = properties.duration().as_secs_f64();
    
    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
    
    let metadata = AudioMetadata {
        title: tag.and_then(|t| t.title().map(|s| s.to_string())),
        artist: tag.and_then(|t| t.artist().map(|s| s.to_string())),
        album: tag.and_then(|t| t.album().map(|s| s.to_string())),
        album_artist: tag.and_then(|t| {
            t.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string())
        }),
        genre: tag.and_then(|t| t.genre().map(|s| s.to_string())),
        year: tag.and_then(|t| t.year()).map(|y| y as i32),
        track_number: tag.and_then(|t| t.track()).map(|t| t as i32),
        duration: Some(duration),
        format: Path::new(path)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_uppercase(),
    };
    
    Ok(metadata)
}

pub fn scan_folder(folder_path: &str) -> Vec<String> {
    let audio_extensions = ["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus"];
    let mut audio_files = Vec::new();
    
    for entry in WalkDir::new(folder_path)
        .into_iter()
        .filter_map(|e| e.ok()) 
    {
        if let Some(ext) = entry.path().extension() {
            let ext_str = ext.to_str().unwrap_or("").to_lowercase();
            if audio_extensions.contains(&ext_str.as_str()) {
                if let Some(path) = entry.path().to_str() {
                    audio_files.push(path.to_string());
                }
            }
        }
    }
    
    audio_files
}