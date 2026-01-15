import React from "react";
import { Trash2, Play, Heart } from "lucide-react";
import { useFavoritesStore } from "../stores/favoritesStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Track } from "../types";

export const Favorites: React.FC = () => {
    const { favorites, removeFavorite, clearFavorites } = useFavoritesStore();
    const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

    const playTrack = (track: Track) => {
        setQueue(favorites);
        setCurrentTrack(track);
        setIsPlaying(true);
    };

    if (favorites.length === 0) {
        return (
            <div className="h-full bg-gray-50 flex items-center justify-center text-gray-400">
                <div className="flex flex-col items-center gap-2">
                    <Heart size={48} />
                    <p>No favorites yet. Add some from Library.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 flex flex-col">
            <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                <div className="font-semibold text-gray-800">Favorites ({favorites.length})</div>
                <button
                    onClick={clearFavorites}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                >
                    <Trash2 size={18} />
                    Clear
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr className="text-left text-sm text-gray-600">
                            <th className="p-3 w-12">#</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Artist</th>
                            <th className="p-3">Album</th>
                            <th className="p-3 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {favorites.map((t, idx) => (
                            <tr
                                key={t.file_path}
                                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                                onClick={() => playTrack(t)}
                            >
                                <td className="p-3">{idx + 1}</td>
                                <td className="p-3 font-medium">{t.title || "Unknown Title"}</td>
                                <td className="p-3 text-gray-600">{t.artist || "Unknown Artist"}</td>
                                <td className="p-3 text-gray-600">{t.album || "Unknown Album"}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="p-2 rounded hover:bg-gray-200"
                                            title="Play"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playTrack(t);
                                            }}
                                        >
                                            <Play size={18} className="text-blue-600" />
                                        </button>

                                        <button
                                            className="p-2 rounded hover:bg-gray-200"
                                            title="Remove"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFavorite(t);
                                            }}
                                        >
                                            <Trash2 size={18} className="text-gray-700" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
