export interface Track {
  // 建议后端保证一定有 id；如果做不到，前端会 fallback 用 file_path
  id?: string | number;

  file_path: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;

  date_added?: number;
  cover_path?: string;
}

export interface Playlist {
  id: string | number;
  name: string;
  tracks: Track[];
  date_created: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Track[];
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}
