import React, { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";

export const Player: React.FC = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isMuted, setIsMuted] = useState(false);

    const {
        currentTrack,
        isPlaying,
        volume,
        currentTime,
        repeat,
        shuffle,
        setIsPlaying,
        setVolume,
        setCurrentTime,
        nextTrack,
        previousTrack,
        toggleShuffle,
        toggleRepeat,
    } = usePlayerStore();

    // 同步音量/静音
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
    }, [volume]);

    // 加载新歌曲：设置 src + load + 可选播放
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack?.file_path) return;

        // 先停掉上一首，避免 “新 load 打断 play()”
        audio.pause();

        const url = convertFileSrc(currentTrack.file_path);
        audio.src = url;
        audio.load();

        setCurrentTime(0);

        if (isPlaying) {
            audio
                .play()
                .catch((e) => {
                    // 切歌瞬间的 AbortError 很常见，忽略即可
                    if (e?.name !== "AbortError") console.error(e);
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack?.file_path]);

    // 播放/暂停控制
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch((e) => {
                if (e?.name !== "AbortError") console.error(e);
            });
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
        if (repeat === "one") {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = 0;
            audio.play().catch((e) => {
                if (e?.name !== "AbortError") console.error(e);
            });
            return;
        }
        nextTrack();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = parseFloat(e.target.value);
        setCurrentTime(audio.currentTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !audio.muted;
        setIsMuted(audio.muted);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (!currentTrack) {
        return (
            <div className="bg-gray-900 text-white p-4 flex items-center justify-center">
                <p className="text-gray-400">No track selected</p>
            </div>
        );
    }

    const duration = usePlayerStore.getState().duration || 0;

    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 shadow-2xl">
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onLoadedMetadata={(e) => {
                    usePlayerStore.setState({ duration: e.currentTarget.duration || 0 });
                }}
            />

            {/* 歌曲信息 */}
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold">{currentTrack.title || "Unknown Title"}</h3>
                    <p className="text-gray-400 text-sm">{currentTrack.artist || "Unknown Artist"}</p>
                </div>
            </div>

            {/* 进度条 */}
            <div className="mb-4">
                <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-center gap-6 mb-4">
                <button
                    onClick={toggleShuffle}
                    className={`p-2 rounded-full transition ${shuffle ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"
                        }`}
                >
                    <Shuffle size={20} />
                </button>

                <button onClick={previousTrack} className="p-3 text-gray-400 hover:text-white transition">
                    <SkipBack size={24} />
                </button>

                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-4 bg-white text-gray-900 rounded-full hover:scale-110 transition shadow-lg"
                >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>

                <button onClick={nextTrack} className="p-3 text-gray-400 hover:text-white transition">
                    <SkipForward size={24} />
                </button>

                <button
                    onClick={toggleRepeat}
                    className={`p-2 rounded-full transition ${repeat !== "none" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"
                        }`}
                >
                    <Repeat size={20} />
                </button>
            </div>

            {/* 音量控制 */}
            <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-400 w-10">{Math.round(volume * 100)}%</span>
            </div>
        </div>
    );
};
