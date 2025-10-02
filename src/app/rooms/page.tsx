'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import NicknameModal from '@/components/NicknameModal';

interface RoomCounts {
  [key: string]: { count: number };
}

export default function RoomsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomCounts, setRoomCounts] = useState<RoomCounts>({});
  const roomCount = 50;
  const rooms = Array.from({ length: roomCount }, (_, i) => i + 1);
  const MAX_USERS_PER_ROOM = 5;

  useEffect(() => {
    const fetchRoomCounts = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setRoomCounts(data);
        }
      } catch (error) { console.error("Failed to fetch room counts:", error); }
    };
    fetchRoomCounts();
    const interval = setInterval(fetchRoomCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRoomClick = (roomId: number) => {
    if ((roomCounts[roomId]?.count || 0) >= MAX_USERS_PER_ROOM) {
      alert('このルームは満員です。');
      return;
    }
    setSelectedRoomId(roomId);
    setIsModalOpen(true);
  };

  const handleConfirmNickname = (nickname: string) => {
    localStorage.setItem('nickname', nickname);
    setIsModalOpen(false);
    if (selectedRoomId) {
      // AudioContextの初期化はせず、すぐに画面遷移する
      router.push(`/session/${selectedRoomId}`);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">ルーム選択</h1>
          <Link href="/session/practice" className="w-full sm:w-auto text-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200">
            一人練習モードに入る
          </Link>
        </div>
        
        <p className="mb-6 text-gray-400">参加したいルームを選択してください。（満員のルームには入れません）</p>
        
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rooms.map((roomId) => {
            const count = roomCounts[roomId]?.count || 0;
            const isFull = count >= MAX_USERS_PER_ROOM;
            return (
              <button
                key={roomId}
                onClick={() => handleRoomClick(roomId)}
                disabled={isFull}
                className={`aspect-square flex flex-col items-center justify-center transition-all duration-200 transform rounded-lg border-2
                  ${isFull 
                    ? 'bg-gray-800 border-gray-700 cursor-not-allowed' 
                    : 'bg-gray-800 hover:bg-cyan-800 border-gray-700 hover:border-cyan-500 hover:scale-105'
                  }`}
              >
                <span className={`text-xl font-bold ${isFull ? 'text-gray-600' : 'text-white'}`}>Room {roomId}</span>
                <span className={`text-lg font-semibold mt-2 ${
                  isFull ? 'text-red-500' : count > 0 ? 'text-cyan-400' : 'text-gray-500'
                }`}>
                  {count} / {MAX_USERS_PER_ROOM} 人
                </span>
              </button>
            )
          })}
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