import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Search, Play, Heart, HeartOff, Plus } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useFavoritesStore } from "../stores/favoritesStore";
import { usePlaylistsStore } from "../stores/playlistsStore";
import type { Track } from "../types";

export const Library: React.FC = () => {
    const { tracks, loading, fetchTracks, scanFolder, searchTracks } = useLibraryStore();
    const { setCurrentTrack, setQueue, setIsPlaying } = usePlayerStore();
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylistsStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

    useEffect(() => {
        void fetchTracks();
    }, [fetchTracks]);

    useEffect(() => {
        setFilteredTracks(tracks);
    }, [tracks]);

    const safeKey = useMemo(() => {
        return (t: Track) => (t.id ?? t.file_path) as React.Key;
    }, []);

    const handleSelectFolder = async () => {
        try {
            const selected = await open({ directory: true, multiple: false });
            if (typeof selected === "string" && selected) {
                await scanFolder(selected);
            }
        } catch (e) {
            console.error("Failed to select folder:", e);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        const q = query.trim();
        if (!q) {
            setFilteredTracks(tracks);
            return;
        }
        const results = await searchTracks(q);
        setFilteredTracks(results);
    };

    const handlePlayTrack = (track: Track) => {
        setQueue(filteredTracks);
        setCurrentTrack(track);
        setIsPlaying(true);
    };

    const handleAddToPlaylist = (track: Track) => {
        // 最简交互：先选现有 playlist；没有就创建
        const existing = playlists.map((p) => `${p.id}:${p.name}`).join("\n");
        const input = window.prompt(
            `Add to which playlist?\n\nExisting:\n${existing || "(none)"}\n\nEnter playlist id (number) OR a new name:`,
        );
        if (!input) return;

        const asId = Number(input);
        if (Number.isFinite(asId) && playlists.some((p) => p.id === asId)) {
            addTrackToPlaylist(asId, track);
            return;
        }

        const newId = createPlaylist(input);
        addTrackToPlaylist(newId, track);
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds || !Number.isFinite(seconds)) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* 工具栏 */}
            <div className="bg-white shadow-sm p-4 flex gap-4">
                <button
                    onClick={handleSelectFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                    <FolderOpen size={20} />
                    Add Folder
                </button>

                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search tracks, artists, albums..."
                        value={searchQuery}
                        onChange={(e) => void handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* 音乐列表 */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    </div>
                ) : filteredTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FolderOpen size={64} className="mb-4" />
                        <p>No music found. Add a folder to get started!</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="text-left text-sm text-gray-600">
                                <th className="p-3 w-12">#</th>
                                <th className="p-3">Title</th>
                                <th className="p-3">Artist</th>
                                <th className="p-3">Album</th>
                                <th className="p-3 w-20">Duration</th>
                                <th className="p-3 w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTracks.map((track, index) => (
                                <tr
                                    key={safeKey(track)}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer group"
                                    onClick={() => handlePlayTrack(track)}
                                >
                                    <td className="p-3">
                                        <div className="flex items-center justify-center">
                                            <span className="group-hover:hidden">{index + 1}</span>
                                            <Play size={16} className="hidden group-hover:block text-blue-500" />
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium">{track.title || "Unknown Title"}</td>
                                    <td className="p-3 text-gray-600">{track.artist || "Unknown Artist"}</td>
                                    <td className="p-3 text-gray-600">{track.album || "Unknown Album"}</td>
                                    <td className="p-3 text-gray-500 text-sm">{formatDuration(track.duration)}</td>

                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-2 rounded hover:bg-gray-200"
                                                title={isFavorite(track) ? "Remove from Favorites" : "Add to Favorites"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(track);
                                                }}
                                            >
                                                {isFavorite(track) ? <Heart size={18} className="text-red-500" /> : <HeartOff size={18} />}
                                            </button>

                                            <button
                                                className="p-2 rounded hover:bg-gray-200"
                                                title="Add to Playlist"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToPlaylist(track);
                                                }}
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
