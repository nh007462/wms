'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  // セッションページ（練習モードを除く）にいるかどうかを判定
  const isSessionPage = pathname.startsWith('/session/') && !pathname.includes('practice');

  const handleLeaveRoom = () => {
    // ページ遷移することで、セッションページのuseEffectクリーンアップ関数がトリガーされる
    window.location.href = '/rooms';
  };

  return (
    <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
          WebRTC Music Session
        </Link>
        {isSessionPage && (
          <button
            onClick={handleLeaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ルームを抜ける
          </button>
        )}
      </nav>
    </header>
  );
}