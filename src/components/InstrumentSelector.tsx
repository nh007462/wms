import { availableInstruments } from '@/lib/toneManager';

interface InstrumentSelectorProps {
  value: string;
  onChange: (instrument: string) => void;
}

export default function InstrumentSelector({ value, onChange }: InstrumentSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="instrument-select" className="font-bold">楽器:</label>
      <select
        id="instrument-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {availableInstruments.map(inst => (
          <option key={inst} value={inst}>{inst.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
        ))}
      </select>
    </div>
  );
}