// ============================================
// 3. 主应用组件 - App.tsx
// ============================================

import { Player } from './components/Player';
import { Library } from './components/Library';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 头部 */}
      <header className="bg-gray-800 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">🎵 Music Player</h1>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-64 bg-gray-800 text-white p-4">
          <nav className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition">
              Library
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 transition">
              Playlists
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 transition">
              Favorites
            </button>
          </nav>
        </aside>

        {/* 音乐库 */}
        <main className="flex-1 overflow-hidden">
          <Library />
        </main>
      </div>

      {/* 播放器 */}
      <footer>
        <Player />
      </footer>
    </div>
  );
}

export default App;