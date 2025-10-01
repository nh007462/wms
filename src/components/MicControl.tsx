import { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

interface MicControlProps {
  onToggle: (enabled: boolean) => Promise<boolean>;
}

export default function MicControl({ onToggle }: MicControlProps) {
  const [isMicOn, setIsMicOn] = useState(false);

  const handleToggle = async () => {
    const newState = !isMicOn;
    const success = await onToggle(newState);
    if(success) {
      setIsMicOn(newState);
    }
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
        />
        <div className={`w-11 h-6 rounded-full peer transition-colors ${isMicOn ? 'bg-green-600' : 'bg-gray-600'} after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isMicOn ? 'after:translate-x-full' : ''}`}></div>
      </label>
    </div>
  );
}