import { FaUserCircle } from 'react-icons/fa';

interface Participant {
  id: string;
  nickname: string;
  instrument?: string;
}

interface ParticipantsProps {
  participants: Participant[];
  localNickname: string;
  localId: string | null;
  selectedInstrument: string;
}

export default function Participants({ participants, localNickname, localId, selectedInstrument }: ParticipantsProps) {
  const allParticipants = [
    { id: localId, nickname: localNickname, instrument: selectedInstrument },
    ...participants
  ].filter(p => p.id); // 自分を含める

  return (
    <div className="mb-4 p-2">
      <div className="flex justify-center items-center gap-4 flex-wrap">
        {allParticipants.map((p) => (
          <div key={p.id} className="bg-gray-800 p-3 rounded-lg flex items-center gap-2 border border-gray-700 min-w-[150px]">
            <FaUserCircle className={p.id === localId ? "text-cyan-400" : "text-gray-400"} size={24} />
            <div className="text-sm">
              <p className={`font-bold truncate ${p.id === localId ? 'text-white' : 'text-gray-300'}`}>{p.nickname}</p>
              <p className="text-xs text-gray-400">{p.instrument || '未選択'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}