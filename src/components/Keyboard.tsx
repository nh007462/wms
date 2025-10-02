'use client';
import { useMemo, useState, useRef } from 'react';

interface KeyboardProps {
  onNoteDown: (note: string) => void;
  onNoteUp: (note: string) => void;
}

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const whiteKeyCount = 36;

export default function Keyboard({ onNoteDown, onNoteUp }: KeyboardProps) {
  const isPointerDownRef = useRef(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handlePointerDown = (note: string) => {
    isPointerDownRef.current = true;
    onNoteDown(note);
    setActiveKey(note);
  };

  const handlePointerUp = (note: string) => {
    onNoteUp(note);
    if (activeKey === note) {
      isPointerDownRef.current = false;
      setActiveKey(null);
    }
  };

  const handlePointerEnter = (note: string) => {
    if (isPointerDownRef.current && activeKey !== note) {
      if (activeKey) {
        onNoteUp(activeKey);
      }
      onNoteDown(note);
      setActiveKey(note);
    }
  };

  const handlePointerLeaveContainer = () => {
    if (isPointerDownRef.current && activeKey) {
      onNoteUp(activeKey);
    }
    isPointerDownRef.current = false;
    setActiveKey(null);
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const note = element?.getAttribute('data-note');

    if (note) {
      handlePointerEnter(note);
    }
  };

  const keys = useMemo(() => {
    const keyData = [];
    let whiteKeyIndex = 0;
    for (let octave = 2; octave <= 7; octave++) {
      for (let i = 0; i < 12; i++) {
        if (octave === 7 && i > 0) break;
        const note = noteNames[i] + octave;
        const isBlack = note.includes('#');
        keyData.push({ note, isBlack, whiteKeyIndex });
        if (!isBlack) whiteKeyIndex++;
      }
    }
    return keyData.slice(0, 61);
  }, []);

  return (
    <div 
      className="relative w-full h-40 bg-gray-900 rounded-b-lg overflow-hidden select-none touch-manipulation"
      onMouseUp={handlePointerLeaveContainer}
      onMouseLeave={handlePointerLeaveContainer}
      onTouchEnd={handlePointerLeaveContainer}
      onTouchCancel={handlePointerLeaveContainer}
      onTouchMove={handleTouchMove}
    >
      <div className="absolute inset-0 flex overflow-x-auto">
        {keys.map(({ note, isBlack }) => 
          !isBlack && (
            <button
              key={note}
              data-note={note}
              onMouseDown={() => handlePointerDown(note)}
              onMouseEnter={() => handlePointerEnter(note)}
              onTouchStart={(e) => { e.preventDefault(); handlePointerDown(note); }}
              className={`relative h-full w-8 border-l border-r border-b border-gray-700 transition-colors duration-75 ${
                activeKey === note ? 'bg-cyan-200' : 'bg-white'
              }`}
              style={{ flex: `1 0 calc(100% / ${whiteKeyCount})` }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500 pointer-events-none">{note}</span>
            </button>
          )
        )}
      </div>
      <div className="absolute inset-0 flex pointer-events-none overflow-x-auto">
         {keys.map(({ note, isBlack, whiteKeyIndex }) => 
          isBlack && (
            <button
              key={note}
              data-note={note}
              onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(note); }}
              onMouseUp={(e) => { e.stopPropagation(); handlePointerUp(note); }}
              onMouseEnter={() => handlePointerEnter(note)}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handlePointerDown(note); }}
              onTouchEnd={(e) => { e.stopPropagation(); handlePointerUp(note); }}
              className={`absolute top-0 h-2/3 w-[55%] border border-gray-700 rounded-b z-10 pointer-events-auto transition-colors duration-75 ${
                activeKey === note ? 'bg-cyan-500' : 'bg-black'
              }`}
              style={{ 
                left: `calc((${whiteKeyIndex} / ${whiteKeyCount}) * 100% - (100% / ${whiteKeyCount} / 4))`,
                maxWidth: '20px'
              }}
            ></button>
          )
        )}
      </div>
    </div>
  );
}