import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Playlist, Track } from "../types";

type PlaylistsStore = {
    playlists: Playlist[];

    createPlaylist: (name: string) => number; // returns playlist id
    deletePlaylist: (id: number) => void;
    renamePlaylist: (id: number, name: string) => void;

    addTrackToPlaylist: (playlistId: number, track: Track) => void;
    removeTrackFromPlaylist: (playlistId: number, track: Track) => void;
};

function keyOf(t: Track) {
    return t.file_path;
}

export const usePlaylistsStore = create<PlaylistsStore>()(
    persist(
        (set, get) => ({
            playlists: [],

            createPlaylist: (name) => {
                const id = Date.now();
                const p: Playlist = {
                    id,
                    name: name.trim() || "New Playlist",
                    tracks: [],
                    date_created: Date.now(),
                };
                set({ playlists: [p, ...get().playlists] });
                return id;
            },

            deletePlaylist: (id) => set({ playlists: get().playlists.filter((p) => p.id !== id) }),

            renamePlaylist: (id, name) =>
                set({
                    playlists: get().playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
                }),

            addTrackToPlaylist: (playlistId, track) => {
                set({
                    playlists: get().playlists.map((p) => {
                        if (p.id !== playlistId) return p;
                        if (p.tracks.some((t) => keyOf(t) === keyOf(track))) return p;
                        return { ...p, tracks: [...p.tracks, track] };
                    }),
                });
            },

            removeTrackFromPlaylist: (playlistId, track) => {
                set({
                    playlists: get().playlists.map((p) => {
                        if (p.id !== playlistId) return p;
                        return { ...p, tracks: p.tracks.filter((t) => keyOf(t) !== keyOf(track)) };
                    }),
                });
            },
        }),
        { name: "music-player:playlists:v1" },
    ),
);
