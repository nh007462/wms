'use client';

import { useEffect, useState, useCallback } from 'react';
import { toneManager, availableInstruments } from '@/lib/toneManager';
import InstrumentSelector from '@/components/InstrumentSelector';
import Keyboard from '@/components/Keyboard';
import Loading from '@/components/Loading';
import MicControl from '@/components/MicControl';
import RecordingControl from '@/components/RecordingControl';

export default function PracticePage() {
  const [selectedInstrument, setSelectedInstrument] = useState('piano');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const handleInitAudio = useCallback(async () => {
    if (isAudioReady) return;
    try {
      await toneManager.init();
      setIsAudioReady(true);
    } catch (e) {
      console.error("Failed to start audio context", e);
      alert("オーディオの初期化に失敗しました。");
    }
  }, [isAudioReady]);

  useEffect(() => {
    if (!isAudioReady) return;
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      await toneManager.loadInstrument(selectedInstrument);
      if (isMounted) setIsLoading(false);
    };
    load();
    return () => { isMounted = false; };
  }, [selectedInstrument, isAudioReady]);
  
  const handleNoteDown = (note: string) => {
    if (!isAudioReady) return;
    toneManager.noteOn(selectedInstrument, note);
  };

  const handleNoteUp = (note: string) => {
    if (!isAudioReady) return;
    toneManager.noteOff(selectedInstrument, note);
  };
  
  return (
    <div className="flex flex-col h-full" onClick={handleInitAudio} onTouchStart={handleInitAudio}>
        <div className="text-center p-4 bg-gray-800 rounded-lg mb-4">
            <h2 className="text-xl font-bold text-cyan-400">一人練習モード</h2>
        </div>
        <div className="flex-grow flex flex-col justify-end p-4 bg-gray-800 rounded-t-lg">
        {!isAudioReady ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
             <h1 className="text-2xl mb-4 animate-pulse">画面をクリックまたはタップして開始</h1>
          </div>
        ) : isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="flex items-center justify-center md:justify-between mb-4 flex-wrap gap-4">
              <InstrumentSelector 
                value={selectedInstrument} 
                onChange={setSelectedInstrument} 
                instrumentList={availableInstruments}
              />
              <div className="flex items-center gap-4">
                {/* <MicControl onToggle={...} /> */}
                <RecordingControl remoteStreams={[]} />
              </div>
            </div>
            <Keyboard onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
          </>
        )}
      </div>
    </div>
  );
}