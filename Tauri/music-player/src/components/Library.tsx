import React, { useEffect, useState } from "react";
import { FolderOpen, Search, Play } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Track } from "../types";

export const Library: React.FC = () => {
    const { tracks, loading, fetchTracks, scanFolder, searchTracks } = useLibraryStore();
    const { setCurrentTrack, setQueue, setIsPlaying } = usePlayerStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    useEffect(() => {
        setFilteredTracks(tracks);
    }, [tracks]);

    const handleSelectFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false
            });

            if (typeof selected === "string" && selected.length > 0) {
                await scanFolder(selected);
            }
        } catch (error) {
            console.error("Failed to select folder:", error);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setFilteredTracks(tracks);
            return;
        }

        const results = await searchTracks(query);
        setFilteredTracks(results);
    };

    const handlePlayTrack = (track: Track) => {
        setCurrentTrack(track);
        setQueue(filteredTracks);
        setIsPlaying(true);
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds || Number.isNaN(seconds)) return "--:--";
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
                        placeholder="Search tracks, artists, albums."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTracks.map((track, index) => (
                                <tr
                                    key={track.id}
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
