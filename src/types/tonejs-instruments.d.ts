// src/types/tonejs-instruments.d.ts
import * as Tone from 'tone';

// 楽器オブジェクトの型をTone.Samplerとして定義
type ToneJsInstrument = Tone.Sampler;

// SampleLibraryグローバルオブジェクトの型を定義
interface SampleLibrary {
  load(options: {
    instruments: string | string[];
    baseUrl?: string;
    onload?: () => void;
  }): ToneJsInstrument | Record<string, ToneJsInstrument>;
}

// SampleLibraryがwindowオブジェクトに存在することをTypeScriptに伝える
declare global {
  interface Window {
    SampleLibrary: SampleLibrary;
  }
}