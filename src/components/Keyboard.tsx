import { useMemo } from 'react';

interface KeyboardProps {
  onPlayNote: (note: string) => void;
}

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function Keyboard({ onPlayNote }: KeyboardProps) {
  const keys = useMemo(() => {
    const keyData = [];
    for (let octave = 2; octave <= 7; octave++) {
      for (let i = 0; i < 12; i++) {
        // C2からC7まで
        if (octave === 7 && i > 0) break;
        const note = noteNames[i] + octave;
        const isBlack = note.includes('#');
        keyData.push({ note, isBlack });
      }
    }
    return keyData.slice(0, 61); // 61鍵
  }, []);

  return (
    <div className="relative w-full h-40 bg-gray-900 rounded-b-lg overflow-hidden">
      <div className="absolute inset-0 flex overflow-x-auto">
        {keys.map(({ note, isBlack }, index) => 
          !isBlack && (
            <button
              key={note}
              onMouseDown={() => onPlayNote(note)}
              className="relative h-full w-8 border-l border-r border-b border-gray-700 bg-white active:bg-cyan-200"
              style={{ flex: '1 0 auto' }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500">{note}</span>
            </button>
          )
        )}
      </div>
      <div className="absolute inset-0 flex pointer-events-none">
        {keys.map(({ note, isBlack }, index) => {
          if (!isBlack) {
            // 黒鍵のためのスペースを確保
            const nextKeyIsBlack = keys[index + 1]?.isBlack;
            const prevKeyIsBlack = keys[index - 1]?.isBlack;
            let marginLeft = "0%";
            if (!prevKeyIsBlack && index > 0) marginLeft = 'calc(100% / 36 * 0.5)'; // 36 is num of white keys
            
            return <div key={note} className="w-8" style={{ flex: '1 0 auto', marginLeft }}></div>;
          } else {
            return (
              <button
                key={note}
                onMouseDown={() => onPlayNote(note)}
                className="absolute h-2/3 w-5 -ml-2.5 bg-black active:bg-gray-700 border border-gray-700 rounded-b z-10 pointer-events-auto"
                style={{ left: `calc(100% / 36 * ${Math.floor(index / 12) * 7 + [0,0,1,1,2,3,3,4,4,5,5,6][index % 12]})` }}
              ></button>
            );
          }
        })}
      </div>
    </div>
  );
}