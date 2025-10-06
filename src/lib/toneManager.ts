// src/lib/toneManager.ts
import * as Tone from 'tone';

// 型定義ファイルは自動で読み込まれるため、ここでのimportは不要です

const loadSampleLibraryScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.SampleLibrary) return resolve();
    const script = document.createElement('script');
    script.src = '/Tonejs-Instruments.js';
    script.onload = () => {
      // スクリプトロード後、変数が定義されるのを少し待つ
      let attempts = 0;
      const interval = setInterval(() => {
        if (window.SampleLibrary) {
          clearInterval(interval);
          resolve();
        } else if (attempts++ > 20) { // 2秒待っても現れない場合は失敗
          clearInterval(interval);
          reject(new Error("SampleLibrary did not load in time."));
        }
      }, 100);
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
};

export const availableInstruments: string[] = [
  "piano", "bass-electric", "bassoon", "cello", "clarinet", "contrabass", "flute",
  "french-horn", "guitar-acoustic", "guitar-electric", "guitar-nylon",
  "harmonium", "harp", "organ", "saxophone", "trombone",
  "trumpet", "tuba", "violin", "xylophone"
];

class ToneManager {
  // 'any'を'Tone.Sampler'に修正
  private instruments: Map<string, Tone.Sampler> = new Map();
  private audioContextStarted: boolean = false;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  public localInstrumentStreamDest: MediaStreamAudioDestinationNode | null = null;
  public localInstrumentStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  public async init() {
    if (this.audioContextStarted) return;
    if (typeof window !== 'undefined' && Tone.context.state !== 'running') {
      await Tone.start();
      this.audioContextStarted = true;
      if (!this.localInstrumentStreamDest) {
        this.localInstrumentStreamDest = Tone.getContext().createMediaStreamDestination();
        this.localInstrumentStream = this.localInstrumentStreamDest.stream;
      }
      console.log("AudioContext and ToneManager initialized.");
    }
  }

  // 'any'を'Tone.Sampler'に修正
  public async loadInstrument(instrumentName: string): Promise<Tone.Sampler | null> {
    if (!this.audioContextStarted) await this.init();
    if (this.instruments.has(instrumentName)) {
      return this.instruments.get(instrumentName)!;
    }
    console.log(`Loading instrument: ${instrumentName}...`);
    try {
      await loadSampleLibraryScript();
      
      // samplerの型をTone.Samplerとして明示
      const sampler = window.SampleLibrary.load({
        instruments: instrumentName,
        baseUrl: "/samples/"
      }) as Tone.Sampler;
      
      await Tone.loaded();
      
      if (this.localInstrumentStreamDest) sampler.connect(this.localInstrumentStreamDest);
      sampler.toDestination();
      
      this.instruments.set(instrumentName, sampler);
      console.log(`Instrument ${instrumentName} loaded.`);
      return sampler;
    } catch (error) {
      console.error(`Failed to load instrument ${instrumentName}:`, error);
      return null;
    }
  }
  
  public noteOn(instrumentName: string, note: string | string[]) {
    const instrument = this.instruments.get(instrumentName);
    if (instrument) instrument.triggerAttack(note, Tone.now());
  }

  public noteOff(instrumentName: string, note: string | string[]) {
    const instrument = this.instruments.get(instrumentName);
    if (instrument) instrument.triggerRelease(note, Tone.now() + 0.05);
  }

  public async toggleMic(enabled: boolean): Promise<MediaStream | null> {
    await this.init();
    if (enabled) {
      if (this.micStream) return this.micStream;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micStream = stream;
        const audioContext = Tone.getContext();
        this.micSourceNode = audioContext.createMediaStreamSource(stream);
        if (this.localInstrumentStreamDest) this.micSourceNode.connect(this.localInstrumentStreamDest);
        this.micSourceNode.connect(audioContext.rawContext.destination);
        console.log("Microphone opened and connected.");
        return stream;
      } catch (e) {
        console.error("Failed to get microphone permission:", e);
        this.micStream = null; this.micSourceNode = null;
        return null;
      }
    } else {
      if (this.micStream) this.micStream.getTracks().forEach(track => track.stop());
      if (this.micSourceNode) this.micSourceNode.disconnect();
      this.micStream = null; this.micSourceNode = null;
      console.log("Microphone closed.");
      return null;
    }
  }
  
  public startRecording(remoteStreams: MediaStream[]) {
    if (this.isRecording || !this.localInstrumentStream) {
      console.warn("Recording cannot start.");
      return;
    }
    
    const allStreams = [...remoteStreams, this.localInstrumentStream];
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
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-recording-${new Date().toISOString()}.webm`;
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

export const toneManager = new ToneManager();