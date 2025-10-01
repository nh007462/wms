// src/lib/toneManager.ts
import * as Tone from 'tone';

// tonejs-instrumentsは型定義がないためanyとして扱う
// @ts-ignore
import { SampleLibrary } from 'tonejs-instruments';

export const availableInstruments: string[] = [
  "bass-electric", "bassoon", "cello", "clarinet", "contrabass", "flute",
  "french-horn", "guitar-acoustic", "guitar-electric", "guitar-nylon",
  "harmonium", "harp", "organ", "piano", "saxophone", "trombone",
  "trumpet", "tuba", "violin", "xylophone"
];

class ToneManager {
  private instruments: Map<string, any> = new Map();
  private audioContextStarted: boolean = false;
  public micSource: Tone.UserMedia | null = null;
  public localInstrumentStreamDest: MediaStreamAudioDestinationNode | null = null;
  public localInstrumentStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.localInstrumentStreamDest = Tone.getContext().createMediaStreamDestination();
      this.localInstrumentStream = this.localInstrumentStreamDest.stream;
    }
  }

  public async startAudioContext() {
    if (this.audioContextStarted) return;
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    this.audioContextStarted = true;
    console.log("AudioContext started");
  }

  public async loadInstrument(instrumentName: string): Promise<any | null> {
    if (this.instruments.has(instrumentName)) {
      return this.instruments.get(instrumentName)!;
    }

    console.log(`Loading instrument: ${instrumentName}...`);
    try {
      // SampleLibrary.loadはPromiseを返さないため、手動でPromise化する
      const sampler = await new Promise<any>((resolve) => {
        const loadedSampler = SampleLibrary.load({
          instruments: instrumentName,
          // ★★★ この行を追加 ★★★
          // public/samples フォルダから音源を読み込むようにパスを指定
          baseUrl: "/samples/",
          onload: () => resolve(loadedSampler)
        });
      });

      // 楽器の出力をメインと、録音用のストリームの両方に接続
      sampler[instrumentName].connect(this.localInstrumentStreamDest);
      sampler[instrumentName].toDestination();

      this.instruments.set(instrumentName, sampler[instrumentName]);
      console.log(`Instrument ${instrumentName} loaded.`);
      return sampler[instrumentName];
    } catch (error) {
      console.error(`Failed to load instrument ${instrumentName}:`, error);
      return null;
    }
  }
  
  public getInstrument(instrumentName: string): any | null {
    return this.instruments.get(instrumentName) || null;
  }
  
  public playNote(instrumentName: string, note: string | string[], duration: Tone.Unit.Time = '8n') {
    const instrument = this.getInstrument(instrumentName);
    if (instrument) {
        instrument.triggerAttackRelease(note, duration, Tone.now());
    }
  }

  public async toggleMic(enabled: boolean): Promise<MediaStream | null> {
    await this.startAudioContext();
    if (enabled) {
      if (this.micSource?.state === 'started') return this.micSource.stream;
      try {
        this.micSource = new Tone.UserMedia();
        await this.micSource.open();
        // マイク音声をメイン出力と録音用ストリームの両方へ
        this.micSource.connect(this.localInstrumentStreamDest!);
        this.micSource.toDestination();
        console.log("Microphone opened and connected.");
        return this.micSource.stream;
      } catch (e) {
        console.error("Failed to get microphone permission:", e);
        this.micSource = null;
        return null;
      }
    } else {
      if (this.micSource) {
        this.micSource.close();
        this.micSource.disconnect();
        this.micSource = null;
        console.log("Microphone closed.");
      }
      return null;
    }
  }

  public startRecording(remoteStreams: MediaStream[]) {
    if (this.isRecording) return;
    
    // すべての音声ソースをミックスする
    const allStreams = [...remoteStreams];
    if(this.localInstrumentStream) {
      allStreams.push(this.localInstrumentStream);
    }

    // MediaStreamをAudioContextに接続
    const audioContext = Tone.getContext();
    const mixedDestination = audioContext.createMediaStreamDestination();
    
    allStreams.forEach(stream => {
      if(stream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(stream).connect(mixedDestination);
      }
    });

    this.recorder = new MediaRecorder(mixedDestination.stream);
    this.recordedChunks = [];

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.recorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `session-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    };

    this.recorder.start();
    this.isRecording = true;
    console.log("Recording started.");
  }

  public stopRecording() {
    if (!this.recorder || !this.isRecording) return;
    this.recorder.stop();
    this.isRecording = false;
    console.log("Recording stopped.");
  }
}

// シングルトンインスタンス
export const toneManager = new ToneManager();