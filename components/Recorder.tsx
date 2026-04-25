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
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  }, [seconds]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
    setPlaying(false);

    intervalRef.current = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= maxSeconds) {
          stopRecording();
          return maxSeconds;
        }
        return current + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    setRecording(false);
  }

  async function togglePlayback() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      await audioRef.current.play();
      setPlaying(true);
    }
  }

  function handleSubmit() {
    if (blob) onSubmit(blob);
  }

  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
        >
          {recording ? "Stop recording" : "Start recording"}
        </button>

        <span className="text-sm text-white/55">
          {formattedTime} / {maxSeconds}s
        </span>

        {recording && (
          <span className="inline-flex items-center gap-2 text-sm text-red-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Recording
          </span>
        )}
      </div>

      {audioUrl && (
        <div className="rounded-3xl border border-white/[0.1] bg-white/[0.035] p-5">
          <p className="text-sm text-white/55">Recording ready. Listen back, then submit.</p>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black px-4 py-4">
            <button
              onClick={togglePlayback}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
            >
              {playing ? "Ⅱ" : "▶"}
            </button>

            <div className="min-w-0 flex-1">
              <div className="h-1.5 rounded-full bg-white/[0.08]">
                <div className="h-full w-1/3 rounded-full bg-white/50" />
              </div>
              <p className="mt-2 text-xs text-white/35">Voice note preview</p>
            </div>

            <span className="text-xs text-white/45">{formattedTime}</span>
          </div>

          <button
            onClick={handleSubmit}
            className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Submit response
          </button>
        </div>
      )}
    </div>
  );
}