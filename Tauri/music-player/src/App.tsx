import { useMemo, useState } from "react";
import { Library } from "./components/Library";
import { Player } from "./components/Player";
import { Playlists } from "./components/Playlists";
import { Favorites } from "./components/Favorites";

type ViewKey = "library" | "playlists" | "favorites";

export default function App() {
  const [view, setView] = useState<ViewKey>("library");

  const title = useMemo(() => {
    if (view === "library") return "Library";
    if (view === "playlists") return "Playlists";
    return "Favorites";
  }, [view]);

  const NavButton = ({
    k,
    label,
  }: {
    k: ViewKey;
    label: string;
  }) => {
    const active = view === k;
    return (
      <button
        onClick={() => setView(k)}
        className={[
          "w-full text-left px-4 py-2 rounded-lg transition",
          active ? "bg-gray-700" : "hover:bg-gray-700",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 头部 */}
      <header className="bg-gray-800 text-white p-4 shadow-lg flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎵 Music Player</h1>
        <span className="text-gray-300 text-sm">{title}</span>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-64 bg-gray-800 text-white p-4">
          <nav className="space-y-2">
            <NavButton k="library" label="Library" />
            <NavButton k="playlists" label="Playlists" />
            <NavButton k="favorites" label="Favorites" />
          </nav>
        </aside>

        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden">
          {view === "library" && <Library />}
          {view === "playlists" && <Playlists />}
          {view === "favorites" && <Favorites />}
        </main>
      </div>

      {/* 播放器 */}
      <footer>
        <Player />
      </footer>
    </div>
  );
}
