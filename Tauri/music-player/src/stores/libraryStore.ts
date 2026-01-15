import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Track } from '../types';

type LibraryStore = {
    tracks: Track[];
    loading: boolean;
    error: string | null;

    fetchTracks: () => Promise<void>;
    scanFolder: (path: string) => Promise<void>;
    searchTracks: (query: string) => Promise<Track[]>;
};

function uniqByFilePath(list: Track[]): Track[] {
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const t of list) {
        if (!t?.file_path) continue;
        if (seen.has(t.file_path)) continue;
        seen.add(t.file_path);
        out.push(t);
    }
    return out;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
    tracks: [],
    loading: false,
    error: null,

    fetchTracks: async () => {
        set({ loading: true, error: null });
        try {
            const tracks = await invoke<Track[]>('get_library');
            set({ tracks: uniqByFilePath(tracks ?? []), loading: false });
        } catch (error) {
            set({ error: String(error), loading: false });
        }
    },

    scanFolder: async (path: string) => {
        set({ loading: true, error: null });
        try {
            const newTracks = await invoke<Track[]>('scan_music_folder', { folderPath: path });
            const merged = uniqByFilePath([...(get().tracks ?? []), ...(newTracks ?? [])]);
            set({ tracks: merged, loading: false });
        } catch (error) {
            set({ error: String(error), loading: false });
        }
    },

    searchTracks: async (query: string) => {
        try {
            const results = await invoke<Track[]>('search_tracks', { query });
            return results ?? [];
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    },
}));
