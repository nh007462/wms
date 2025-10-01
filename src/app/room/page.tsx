'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NicknameModal from '@/components/NicknameModal';

export default function RoomsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const roomCount = 50;
  const rooms = Array.from({ length: roomCount }, (_, i) => i + 1);

  const handleRoomClick = (roomId: number) => {
    setSelectedRoomId(roomId);
    setIsModalOpen(true);
  };

  const handleConfirmNickname = (nickname: string) => {
    localStorage.setItem('nickname', nickname);
    setIsModalOpen(false);
    if (selectedRoomId) {
      router.push(`/session/${selectedRoomId}`);
    }
  };
  
  const handlePracticeModeToggle = () => {
    setIsPracticeMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // 一人モードの場合はニックネーム不要で即座に移動
        router.push('/session/practice');
      }
      return newMode;
    });
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6">ルーム選択</h1>
        
        <div className="flex items-center space-x-3 mb-8 bg-gray-800 p-3 rounded-lg">
          <span className={`font-medium ${isPracticeMode ? 'text-gray-500' : 'text-cyan-400'}`}>複数人モード</span>
          <label htmlFor="mode-toggle" className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="mode-toggle" 
              className="sr-only peer" 
              checked={isPracticeMode}
              onChange={handlePracticeModeToggle}
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
          <span className={`font-medium ${isPracticeMode ? 'text-cyan-400' : 'text-gray-500'}`}>一人モード</span>
        </div>

        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rooms.map((roomId) => (
            <button
              key={roomId}
              onClick={() => handleRoomClick(roomId)}
              className="aspect-square bg-gray-800 hover:bg-cyan-800 border-2 border-gray-700 hover:border-cyan-500 rounded-lg flex flex-col items-center justify-center transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-xl font-bold">Room {roomId}</span>
              {/* ここでAPIを叩いて現在の人数を表示することも可能 */}
            </button>
          ))}
        </div>
      </div>

      <NicknameModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmNickname}
      />
    </>
  );
}