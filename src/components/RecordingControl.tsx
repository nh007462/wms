'use client';
import { useState } from 'react';
import { toneManager } from '@/lib/toneManager';
import { FaRecordVinyl, FaStopCircle } from 'react-icons/fa';

interface RecordingControlProps {
    remoteStreams: MediaStream[];
}

export default function RecordingControl({ remoteStreams }: RecordingControlProps) {
    const [isRecording, setIsRecording] = useState(false);

    const startRecording = () => {
        toneManager.startRecording(remoteStreams);
        setIsRecording(true);
    };

    const stopRecording = () => {
        toneManager.stopRecording();
        setIsRecording(false);
    };

    return (
        <div className="flex items-center gap-2">
            {!isRecording ? (
                <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                    <FaRecordVinyl />
                    <span>録音開始</span>
                </button>
            ) : (
                <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors animate-pulse">
                    <FaStopCircle />
                    <span>録音停止</span>
                </button>
            )}
        </div>
    );
}