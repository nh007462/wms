import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-grow text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 animate-pulse">
        Welcome to WebRTC Music Session
      </h1>
      <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl">
        リアルタイムで世界中の仲間と音楽を奏でよう。
        さあ、セッションを始めよう！
      </p>
      <Link href="/rooms" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg">
          ルームを選択する
      </Link>
    </div>
  );
}