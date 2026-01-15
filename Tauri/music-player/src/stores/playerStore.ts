import { create } from "zustand";
import type { Track, PlayerState } from "../types";

type PlayerStore = PlayerState & {
    setCurrentTrack: (track: Track) => void;
    setIsPlaying: (playing: boolean) => void;
    setVolume: (volume: number) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setQueue: (queue: Track[]) => void;

    nextTrack: () => void;
    previousTrack: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
};

function sameTrack(a: Track | null, b: Track | null): boolean {
    if (!a || !b) return false;
    if (a.id != null && b.id != null) return a.id === b.id;
    return a.file_path === b.file_path;
}

function clamp01(v: number) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    queue: [],
    shuffle: false,
    repeat: "none",

    setCurrentTrack: (track) => set({ currentTrack: track, currentTime: 0, duration: 0 }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setVolume: (volume) => set({ volume: clamp01(volume) }),
    setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
    setDuration: (duration) => set({ duration: Math.max(0, duration) }),
    setQueue: (queue) => set({ queue: queue ?? [] }),

    nextTrack: () => {
        const { queue, currentTrack, shuffle, repeat } = get();
        if (!currentTrack || queue.length === 0) return;

        const currentIndex = queue.findIndex((t) => sameTrack(t, currentTrack));
        if (currentIndex < 0) return;

        if (repeat === "one") return;

        let nextIndex = currentIndex + 1;

        if (shuffle && queue.length > 1) {
            let tries = 10;
            do {
                nextIndex = Math.floor(Math.random() * queue.length);
                tries -= 1;
            } while (tries > 0 && nextIndex === currentIndex);
        } else {
            if (nextIndex >= queue.length) {
                if (repeat === "all") nextIndex = 0;
                else {
                    set({ isPlaying: false });
                    return;
                }
            }
        }

        set({ currentTrack: queue[nextIndex], currentTime: 0, duration: 0 });
    },

    previousTrack: () => {
        const { queue, currentTrack, shuffle } = get();
        if (!currentTrack || queue.length === 0) return;

        const currentIndex = queue.findIndex((t) => sameTrack(t, currentTrack));
        if (currentIndex < 0) return;

        let prevIndex = currentIndex - 1;

        if (shuffle && queue.length > 1) {
            let tries = 10;
            do {
                prevIndex = Math.floor(Math.random() * queue.length);
                tries -= 1;
            } while (tries > 0 && prevIndex === currentIndex);
        } else {
            if (prevIndex < 0) prevIndex = queue.length - 1;
        }

        set({ currentTrack: queue[prevIndex], currentTime: 0, duration: 0 });
    },

    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    toggleRepeat: () =>
        set((s) => ({
            repeat: s.repeat === "none" ? "all" : s.repeat === "all" ? "one" : "none",
        })),
}));
