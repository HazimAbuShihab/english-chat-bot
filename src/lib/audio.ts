// =============================================================================
// Microphone / audio-recording helpers built on the MediaRecorder API.
// Kept framework-agnostic so it can be unit-tested or reused outside React.
// =============================================================================

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  extension: string;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
];

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "audio/webm";
}

function extensionFor(mimeType: string): string {
  const base = mimeType.split(";")[0];
  return EXTENSION_BY_MIME[base] ?? "webm";
}

/**
 * A thin wrapper around MediaRecorder that manages the media stream lifecycle
 * and reports elapsed time. One instance = one microphone session.
 */
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mimeType = "audio/webm";

  /** Request microphone access. Throws if the user denies permission. */
  async requestPermission(): Promise<MediaStream> {
    if (!isRecordingSupported()) {
      throw new Error("Audio recording is not supported in this browser.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return this.stream;
  }

  get mediaStream(): MediaStream | null {
    return this.stream;
  }

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  start(): void {
    if (!this.stream) {
      throw new Error("Call requestPermission() before start().");
    }
    this.mimeType = pickMimeType();
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(250); // gather chunks periodically for resilience
    this.startedAt = Date.now();
  }

  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error("Recorder was not started."));
        return;
      }
      recorder.onstop = () => {
        const durationSeconds = (Date.now() - this.startedAt) / 1000;
        const blob = new Blob(this.chunks, { type: this.mimeType });
        resolve({
          blob,
          mimeType: this.mimeType,
          durationSeconds,
          extension: extensionFor(this.mimeType),
        });
      };
      recorder.onerror = (event) => reject((event as ErrorEvent).error ?? new Error("Recording failed"));
      recorder.stop();
    });
  }

  /** Stop the microphone and release the OS-level recording indicator. */
  dispose(): void {
    try {
      this.recorder?.state === "recording" && this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}
