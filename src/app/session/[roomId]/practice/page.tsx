'use client';

import InstrumentSelector from '@/components/InstrumentSelector';
import Keyboard from '@/components/Keyboard';
import MicControl from '@/components/MicControl';
import { useEffect, useState } from 'react';
import { toneManager } from '@/lib/toneManager';

export default function PracticePage() {
  const [selectedInstrument, setSelectedInstrument] = useState('piano');

  useEffect(() => {
    toneManager.startAudioContext();
    toneManager.loadInstrument(selectedInstrument);
  }, [selectedInstrument]);
  
  const handlePlayNote = (note: string) => {
    toneManager.playNote(selectedInstrument, note);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-center p-4 bg-gray-800 rounded-lg mb-4">
        <h2 className="text-xl font-bold text-cyan-400">一人練習モード</h2>
      </div>
      <div className="flex-grow flex flex-col justify-end p-4 bg-gray-800 rounded-t-lg">
        <div className="flex items-center justify-center md:justify-between mb-4 flex-wrap gap-4">
          <InstrumentSelector 
            value={selectedInstrument} 
            onChange={setSelectedInstrument} 
          />
          <div className="flex items-center gap-4">
            <MicControl onToggle={toneManager.toggleMic} />
             {/* <RecordingControl /> */}
          </div>
        </div>
        <Keyboard onPlayNote={handlePlayNote} />
      </div>
    </div>
  );
}