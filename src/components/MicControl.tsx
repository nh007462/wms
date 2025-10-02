'use client';
import { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

interface MicControlProps {
  // onToggleはbooleanを返すPromiseであると定義
  onToggle: (enabled: boolean) => Promise<boolean>;
}

export default function MicControl({ onToggle }: MicControlProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const newState = !isMicOn;
    // onToggle関数の結果（成功したか）を受け取る
    const success = await onToggle(newState);
    
    // 成功した場合のみUIの状態を更新
    if (success) {
      setIsMicOn(newState);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isMicOn ? 
        <FaMicrophone size={24} className="text-green-500" /> : 
        <FaMicrophoneSlash size={24} className="text-red-500" />
      }
      <label htmlFor="mic-toggle" className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          id="mic-toggle" 
          className="sr-only peer" 
          checked={isMicOn}
          onChange={handleToggle}
          disabled={isProcessing}
        />
        <div className={`w-11 h-6 rounded-full peer transition-colors ${isMicOn ? 'bg-green-600' : 'bg-gray-600'} after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isMicOn ? 'after:translate-x-full' : ''} ${isProcessing ? 'opacity-50' : ''}`}></div>
      </label>
    </div>
  );
}