import * as React from "react";
import { AudioRecorder, isRecordingSupported, type RecordingResult } from "@/lib/audio";

type Permission = "unknown" | "granted" | "denied";
type Status = "idle" | "recording" | "stopped";

/**
 * React wrapper around AudioRecorder that also exposes a live input level
 * (0..1) via the Web Audio API, an elapsed timer, and permission state.
 */
export function useRecorder() {
  const recorderRef = React.useRef<AudioRecorder | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const [supported] = React.useState(isRecordingSupported);
  const [permission, setPermission] = React.useState<Permission>("unknown");
  const [status, setStatus] = React.useState<Status>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [level, setLevel] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const runLevelLoop = React.useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buffer = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);
      setLevel(Math.min(1, rms * 2.2));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const requestPermission = React.useCallback(async () => {
    try {
      setError(null);
      const recorder = new AudioRecorder();
      const stream = await recorder.requestPermission();
      recorderRef.current = recorder;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      runLevelLoop();

      setPermission("granted");
      return true;
    } catch (err) {
      setPermission("denied");
      setError(err instanceof Error ? err.message : "Microphone access denied");
      return false;
    }
  }, [runLevelLoop]);

  const start = React.useCallback(() => {
    if (!recorderRef.current) return;
    recorderRef.current.start();
    setStatus("recording");
    setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 200);
  }, []);

  const stop = React.useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderRef.current) return null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const result = await recorderRef.current.stop();
    setStatus("stopped");
    setElapsed(result.durationSeconds);
    return result;
  }, []);

  const reset = React.useCallback(() => {
    setStatus("idle");
    setElapsed(0);
  }, []);

  const dispose = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.dispose();
    void audioCtxRef.current?.close().catch(() => undefined);
    recorderRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setPermission("unknown");
    setStatus("idle");
    setLevel(0);
  }, []);

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.dispose();
      void audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  return { supported, permission, status, elapsed, level, error, requestPermission, start, stop, reset, dispose };
}
