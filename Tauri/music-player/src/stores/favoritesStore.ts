import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "../types";

type FavoritesStore = {
    favorites: Track[];
    isFavorite: (track: Track) => boolean;
    toggleFavorite: (track: Track) => void;
    removeFavorite: (track: Track) => void;
    clearFavorites: () => void;
};

function keyOf(t: Track) {
    return t.file_path;
}

export const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favorites: [],

            isFavorite: (track) => get().favorites.some((t) => keyOf(t) === keyOf(track)),

            toggleFavorite: (track) => {
                const exists = get().favorites.some((t) => keyOf(t) === keyOf(track));
                if (exists) {
                    set({ favorites: get().favorites.filter((t) => keyOf(t) !== keyOf(track)) });
                } else {
                    set({ favorites: [track, ...get().favorites] });
                }
            },

            removeFavorite: (track) => {
                set({ favorites: get().favorites.filter((t) => keyOf(t) !== keyOf(track)) });
            },

            clearFavorites: () => set({ favorites: [] }),
        }),
        { name: "music-player:favorites:v1" },
    ),
);
