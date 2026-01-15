import { create } from 'zustand';
import type { PlayerState, Track } from '../types';

type RepeatMode = PlayerState['repeat'];

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
    repeat: 'none',

    setCurrentTrack: (track) =>
        set({
            currentTrack: track,
            currentTime: 0,
            duration: 0,
        }),

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

        // repeat-one：这里不处理（Player.tsx 的 ended 已经处理），避免重复逻辑打架
        if (repeat === 'one') return;

        let nextIndex = currentIndex + 1;

        if (shuffle && queue.length > 1) {
            // 随机选一个不同于当前的
            let tries = 10;
            do {
                nextIndex = Math.floor(Math.random() * queue.length);
                tries -= 1;
            } while (tries > 0 && nextIndex === currentIndex);
        } else {
            // 非 shuffle：走顺序
            if (nextIndex >= queue.length) {
                if (repeat === 'all') {
                    nextIndex = 0;
                } else {
                    // repeat none 且到最后一首：停止播放（修复“最后一首无限循环”）
                    set({ isPlaying: false });
                    return;
                }
            }
        }

        set({
            currentTrack: queue[nextIndex],
            currentTime: 0,
            duration: 0,
        });
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

        set({
            currentTrack: queue[prevIndex],
            currentTime: 0,
            duration: 0,
        });
    },

    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    toggleRepeat: () =>
        set((state) => {
            const next: RepeatMode = state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none';
            return { repeat: next };
        }),
}));
