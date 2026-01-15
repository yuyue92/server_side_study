import React, { useMemo, useState } from "react";
import { Plus, Trash2, Play, Pencil, Music2 } from "lucide-react";

import { usePlaylistsStore } from "../stores/playlistsStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Track } from "../types";

export const Playlists: React.FC = () => {
    const { playlists, createPlaylist, deletePlaylist, renamePlaylist, addTrackToPlaylist, removeTrackFromPlaylist } =
        usePlaylistsStore();
    const { tracks } = useLibraryStore();
    const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

    const [selectedId, setSelectedId] = useState<number | null>(playlists[0]?.id ?? null);

    const selected = useMemo(() => playlists.find((p) => p.id === selectedId) ?? null, [playlists, selectedId]);

    const create = () => {
        const name = window.prompt("Playlist name?");
        if (!name) return;
        const id = createPlaylist(name);
        setSelectedId(id);
    };

    const rename = (id: number) => {
        const name = window.prompt("New playlist name?");
        if (!name) return;
        renamePlaylist(id, name);
    };

    const playPlaylist = () => {
        if (!selected || selected.tracks.length === 0) return;
        setQueue(selected.tracks);
        setCurrentTrack(selected.tracks[0]);
        setIsPlaying(true);
    };

    const playTrack = (t: Track) => {
        if (!selected) return;
        setQueue(selected.tracks);
        setCurrentTrack(t);
        setIsPlaying(true);
    };

    const addFromLibraryPrompt = () => {
        if (!selected) return;

        const q = window.prompt("Type a keyword to find a track from Library (title/artist/album):");
        if (!q) return;

        const kw = q.trim().toLowerCase();
        const found = tracks.find((t) => {
            const s = `${t.title ?? ""} ${t.artist ?? ""} ${t.album ?? ""}`.toLowerCase();
            return s.includes(kw);
        });

        if (!found) {
            window.alert("No match found in Library. Try another keyword.");
            return;
        }

        addTrackToPlaylist(selected.id, found);
    };

    return (
        <div className="h-full bg-gray-50 flex">
            {/* 左侧：playlist 列表 */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 flex items-center justify-between">
                    <div className="font-semibold text-gray-800">Playlists</div>
                    <button onClick={create} className="p-2 rounded hover:bg-gray-100" title="Create playlist">
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {playlists.length === 0 ? (
                        <div className="p-4 text-gray-400">No playlists. Create one.</div>
                    ) : (
                        <ul className="p-2">
                            {playlists.map((p) => {
                                const active = p.id === selectedId;
                                return (
                                    <li key={p.id}>
                                        <button
                                            onClick={() => setSelectedId(p.id)}
                                            className={[
                                                "w-full text-left px-3 py-2 rounded flex items-center justify-between",
                                                active ? "bg-gray-100" : "hover:bg-gray-50",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Music2 size={16} className="text-gray-600" />
                                                <span className="font-medium text-gray-800">{p.name}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{p.tracks.length}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 右侧：playlist 详情 */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <div className="font-semibold text-gray-800">{selected?.name ?? "Select a playlist"}</div>
                        <div className="text-xs text-gray-500">{selected ? `${selected.tracks.length} tracks` : ""}</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={!selected}
                            onClick={() => selected && rename(selected.id)}
                            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                            title="Rename"
                        >
                            <Pencil size={18} />
                        </button>

                        <button
                            disabled={!selected}
                            onClick={addFromLibraryPrompt}
                            className="px-3 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                            title="Add track from Library"
                        >
                            Add Track
                        </button>

                        <button
                            disabled={!selected || (selected?.tracks.length ?? 0) === 0}
                            onClick={playPlaylist}
                            className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                            title="Play playlist"
                        >
                            <Play size={18} />
                            Play
                        </button>

                        <button
                            disabled={!selected}
                            onClick={() => {
                                if (!selected) return;
                                const ok = window.confirm(`Delete playlist "${selected.name}"?`);
                                if (!ok) return;
                                deletePlaylist(selected.id);
                                setSelectedId(playlists.filter((p) => p.id !== selected.id)[0]?.id ?? null);
                            }}
                            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                            title="Delete"
                        >
                            <Trash2 size={18} className="text-red-600" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {!selected ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Select a playlist on the left.</div>
                    ) : selected.tracks.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            Empty playlist. Click “Add Track” to import from Library.
                        </div>
                    ) : (
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
                                {selected.tracks.map((t, idx) => (
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
                                                    title="Remove from playlist"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeTrackFromPlaylist(selected.id, t);
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
                    )}
                </div>
            </div>
        </div>
    );
};
