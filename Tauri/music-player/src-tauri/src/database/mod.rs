use rusqlite::{Connection, Result, params};
use std::sync::Mutex;

pub struct Database(pub Mutex<Connection>);  // ✅ 确保 Mutex 有泛型参数

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct Track {
    pub id: Option<i64>,
    pub file_path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub duration: Option<f64>,
    pub date_added: i64,
}

pub fn init_database() -> Result<Database> {
    let conn = Connection::open("music_library.db")?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT UNIQUE NOT NULL,
            title TEXT,
            artist TEXT,
            album TEXT,
            album_artist TEXT,
            genre TEXT,
            year INTEGER,
            track_number INTEGER,
            duration REAL,
            date_added INTEGER NOT NULL
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_artist ON tracks(artist)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_album ON tracks(album)",
        [],
    )?;
    
    Ok(Database(Mutex::new(conn)))
}

pub fn insert_track(db: &Database, track: &Track) -> Result<i64> {
    let conn = db.0.lock().unwrap();
    
    conn.execute(
        "INSERT OR REPLACE INTO tracks 
         (file_path, title, artist, album, album_artist, genre, year, track_number, duration, date_added)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            &track.file_path,
            &track.title,
            &track.artist,
            &track.album,
            &track.album_artist,
            &track.genre,
            &track.year,
            &track.track_number,
            &track.duration,
            &track.date_added,
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

pub fn get_all_tracks(db: &Database) -> Result<Vec<Track>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, file_path, title, artist, album, album_artist, genre, year, track_number, duration, date_added 
         FROM tracks 
         ORDER BY artist, album, track_number"
    )?;
    
    let tracks = stmt.query_map([], |row| {
        Ok(Track {
            id: row.get(0)?,
            file_path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            album_artist: row.get(5)?,
            genre: row.get(6)?,
            year: row.get(7)?,
            track_number: row.get(8)?,
            duration: row.get(9)?,
            date_added: row.get(10)?,
        })
    })?;
    
    tracks.collect()
}

pub fn search_tracks(db: &Database, query: &str) -> Result<Vec<Track>> {
    let conn = db.0.lock().unwrap();
    let search_pattern = format!("%{}%", query);
    
    let mut stmt = conn.prepare(
        "SELECT id, file_path, title, artist, album, album_artist, genre, year, track_number, duration, date_added 
         FROM tracks 
         WHERE title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
         ORDER BY artist, album"
    )?;
    
    let tracks = stmt.query_map([&search_pattern], |row| {
        Ok(Track {
            id: row.get(0)?,
            file_path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            album_artist: row.get(5)?,
            genre: row.get(6)?,
            year: row.get(7)?,
            track_number: row.get(8)?,
            duration: row.get(9)?,
            date_added: row.get(10)?,
        })
    })?;
    
    tracks.collect()
}