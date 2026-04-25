"use client";
import { useEffect, useMemo, useRef, useState } from "react";

interface RecorderProps {
  maxSeconds?: number;
  onSubmit: (audioBlob: Blob) => void;
}

export default function Recorder({ maxSeconds = 90, onSubmit }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const recorded = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(recorded);
      setAudioUrl(url);
      setBlob(recorded);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
    setSeconds(0);
    setAudioUrl(null);
    setBlob(null);

    intervalRef.current = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= maxSeconds) {
          stopRecording();
          return maxSeconds;
        }
        return current + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
  };

  const handleSubmit = () => {
    if (blob) onSubmit(blob);
  };

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  }, [seconds]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className="rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
        >
          {recording ? "Stop recording" : "Start recording"}
        </button>
        <span className="text-sm text-zinc-300">{formattedTime} / {maxSeconds}s</span>
      </div>

      {audioUrl && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
          <p className="text-sm text-zinc-300">Recording ready — listen back then submit.</p>
          <audio controls src={audioUrl} className="w-full" />
          <button
            onClick={handleSubmit}
            className="rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
          >
            Submit response
          </button>
        </div>
      )}
    </div>
  );
}