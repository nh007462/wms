'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toneManager, availableInstruments } from '@/lib/toneManager';
import { useWebRTC } from '@/hooks/useWebRTC';
import Participants from '@/components/Participants';
import InstrumentSelector from '@/components/InstrumentSelector';
import Keyboard from '@/components/Keyboard';
import MicControl from '@/components/MicControl';
import RecordingControl from '@/components/RecordingControl';
import Loading from '@/components/Loading';

export default function SessionPage() {
  const params = useParams();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;
  
  // UIの状態を管理する3つのstate
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(true); // 楽器ロード中か
  const [isInstrumentReady, setIsInstrumentReady] = useState(false);  // 楽器ロード完了後か
  const [isSessionActive, setIsSessionActive] = useState(false);    // ユーザーが入室ボタンを押したか

  // isSessionActiveがtrueになってからWebRTC接続を開始する
  const { participants, localNickname, localId, broadcastDataChannelMessage, toggleMic, remoteStreams } = useWebRTC(roomId, isSessionActive);
  
  const [selectedInstrument, setSelectedInstrument] = useState('piano');

  // 楽器の読み込み処理 (ページ表示時に一度だけ実行)
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      // サーバーサイドでは実行しない
      if (typeof window === 'undefined') return;
      
      setIsLoadingInstrument(true);
      await toneManager.loadInstrument(selectedInstrument);
      if (isMounted) {
        setIsLoadingInstrument(false);
        setIsInstrumentReady(true); // 楽器の準備ができたことを示す
      }
    };
    load();
    return () => { isMounted = false; };
  }, []); // 依存配列を空にして初回のみ実行

  // 「入室する」ボタンが押された時の処理
  const handleEnterSession = useCallback(async () => {
    if (isSessionActive) return;
    try {
      // このユーザー操作をきっかけにAudioContextを起動
      await toneManager.init();
      // セッションを開始状態にする
      setIsSessionActive(true);
    } catch (e) {
      console.error("Failed to start audio context", e);
      alert("オーディオの初期化に失敗しました。");
    }
  }, [isSessionActive]);
  
  // 楽器が変更された時の処理
  const handleInstrumentChange = (instrument: string) => {
    setSelectedInstrument(instrument);
    // 自分の楽器変更を他のピアに通知
    broadcastDataChannelMessage({ type: 'instrumentChange', instrument: instrument });
  };
  
  const handleNoteDown = (note: string) => {
    if (!isSessionActive) return;
    toneManager.noteOn(selectedInstrument, note);
    broadcastDataChannelMessage({ type: 'noteOn', note, instrument: selectedInstrument });
  };

  const handleNoteUp = (note: string) => {
    if (!isSessionActive) return;
    toneManager.noteOff(selectedInstrument, note);
    broadcastDataChannelMessage({ type: 'noteOff', note, instrument: selectedInstrument });
  };
  
  // UIの条件分岐レンダリング
  const renderContent = () => {
    if (isLoadingInstrument) {
      return <Loading />;
    }
    if (isInstrumentReady && !isSessionActive) {
      return (
        <div className="flex flex-col items-center justify-center flex-grow text-center">
          <h2 className="text-3xl font-bold mb-8">楽器の準備ができました！</h2>
          <button
            onClick={handleEnterSession}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-2xl py-6 px-12 rounded-full transition-transform transform hover:scale-105 shadow-lg animate-pulse"
          >
            セッションに参加する
          </button>
        </div>
      );
    }
    if (isSessionActive) {
      return (
        <>
          <div className="flex items-center justify-center md:justify-between mb-4 flex-wrap gap-4">
            <InstrumentSelector 
              value={selectedInstrument} 
              onChange={handleInstrumentChange}
              instrumentList={availableInstruments}
            />
            <div className="flex items-center gap-4">
               <MicControl onToggle={toggleMic} />
               <RecordingControl remoteStreams={remoteStreams} />
            </div>
          </div>
          <Keyboard onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
        </>
      );
    }
    return null; // どれにも当てはまらない場合
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
        {renderContent()}
      </div>
    </div>
  );
}