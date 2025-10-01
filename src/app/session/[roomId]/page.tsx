'use client';

import { useParams } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import Participants from '@/components/Participants';
import InstrumentSelector from '@/components/InstrumentSelector';
import Keyboard from '@/components/Keyboard';
import MicControl from '@/components/MicControl';
import RecordingControl from '@/components/RecordingControl';
import { useEffect, useState } from 'react';
import { toneManager } from '@/lib/toneManager';

export default function SessionPage() {
  const params = useParams();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;
  const { participants, localNickname, localId, broadcastDataChannelMessage, toggleMic } = useWebRTC(roomId);
  const [selectedInstrument, setSelectedInstrument] = useState('piano');

  useEffect(() => {
    toneManager.startAudioContext();
    toneManager.loadInstrument(selectedInstrument);
  }, [selectedInstrument]);

  const handleInstrumentChange = (instrument: string) => {
    setSelectedInstrument(instrument);
    broadcastDataChannelMessage({ type: 'instrumentChange', instrument });
  };
  
  const handlePlayNote = (note: string) => {
    toneManager.playNote(selectedInstrument, note);
    broadcastDataChannelMessage({ type: 'note', note, instrument: selectedInstrument, duration: '8n' });
  };

  return (
    <div className="flex flex-col h-full">
      <Participants 
        participants={participants} 
        localNickname={localNickname} 
        localId={localId}
        selectedInstrument={selectedInstrument} 
      />
      <div className="flex-grow flex flex-col justify-end p-4 bg-gray-800 rounded-t-lg">
        <div className="flex items-center justify-center md:justify-between mb-4 flex-wrap gap-4">
          <InstrumentSelector 
            value={selectedInstrument} 
            onChange={handleInstrumentChange} 
          />
          <div className="flex items-center gap-4">
            <MicControl onToggle={toggleMic} />
            {/* <RecordingControl /> */}
            {/* 録音機能は複雑なため、一度コメントアウト。後で実装。 */}
          </div>
        </div>
        <Keyboard onPlayNote={handlePlayNote} />
      </div>
    </div>
  );
}