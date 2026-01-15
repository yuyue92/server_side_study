use crate::database::{Track, get_all_tracks, insert_track, search_tracks as db_search, Database};
use crate::scanner::{scan_folder, scan_audio_file};
use tauri::State;

#[tauri::command]
pub async fn select_music_folder(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let folder = app.dialog()
        .file()
        .blocking_pick_folder();
    
    match folder {
        Some(path) => {
            // Tauri 2.0: FilePath 类型需要先转换为 PathBuf
            let path_buf = path.as_path()
                .ok_or_else(|| "Failed to get path".to_string())?;
            
            // 再转换为字符串
            path_buf.to_str()
                .ok_or_else(|| "Invalid path".to_string())
                .map(|s| s.to_string())
        },
        None => Err("No folder selected".to_string())
    }
}

#[tauri::command]
pub async fn scan_music_folder(
    db: State<'_, Database>,
    folder_path: String,
) -> Result<Vec<Track>, String> {
    let audio_files = scan_folder(&folder_path);
    let mut tracks = Vec::new();
    
    for file_path in audio_files {
        match scan_audio_file(&file_path) {
            Ok(metadata) => {
                let track = Track {
                    id: None,
                    file_path: file_path.clone(),
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    album_artist: metadata.album_artist,
                    genre: metadata.genre,
                    year: metadata.year,
                    track_number: metadata.track_number,
                    duration: metadata.duration,
                    date_added: chrono::Utc::now().timestamp(),
                };
                
                match insert_track(&db, &track) {
                    Ok(_) => tracks.push(track),
                    Err(e) => eprintln!("Failed to insert track: {}", e),
                }
            }
            Err(e) => eprintln!("Failed to scan {}: {}", file_path, e),
        }
    }
    
    Ok(tracks)
}

#[tauri::command]
pub async fn get_library(db: State<'_, Database>) -> Result<Vec<Track>, String> {
    get_all_tracks(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_tracks(
    db: State<'_, Database>,
    query: String,
) -> Result<Vec<Track>, String> {
    db_search(&db, &query).map_err(|e| e.to_string())
}