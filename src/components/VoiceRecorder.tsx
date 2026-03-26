"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: "sm" | "lg";
}

type RecordingState = "idle" | "recording" | "transcribing" | "error";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export function VoiceRecorder({ onTranscript, disabled, size = "sm" }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [timer, setTimer] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [barHeights, setBarHeights] = useState<number[]>(Array(24).fill(4));
  const [errorMessage, setErrorMessage] = useState("");
  const [supported, setSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSpeechRecognition =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setSupported(hasSpeechRecognition);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createRecognition(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    return recognition;
  }

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [cleanup]);

  async function startVisualizer() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function updateBars() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const bars = Array.from({ length: 24 }, (_, i) => {
          const idx = Math.floor((i / 24) * dataArray.length);
          const val = dataArray[idx] / 255;
          return Math.max(4, val * (size === "lg" ? 48 : 32));
        });
        setBarHeights(bars);
        animFrameRef.current = requestAnimationFrame(updateBars);
      }

      updateBars();
    } catch {
      // Mic access denied — still allow speech recognition to work
    }
  }

  function startRecording() {
    if (!supported || disabled) return;

    const recognition = createRecognition();
    if (!recognition) {
      setState("error");
      setErrorMessage("Voice recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current = recognition;
    setFinalText("");
    setInterimText("");
    setTimer(0);
    setState("recording");

    // Start timer
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    // Start audio visualization
    startVisualizer();

    let accumulated = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        accumulated += (accumulated ? " " : "") + final.trim();
        setFinalText(accumulated);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return; // ignore no-speech
      if (event.error === "aborted") return; // ignore user abort
      console.error("Speech recognition error:", event.error);
      cleanup();
      setState("error");
      setErrorMessage(
        event.error === "not-allowed"
          ? "Microphone access was denied. Please allow microphone permissions."
          : "Voice recognition encountered an error. Please try again."
      );
    };

    recognition.onend = () => {
      // If we still have text, deliver it
      if (state === "recording" || accumulated || interimText) {
        const text = (accumulated + (interimText ? " " + interimText : "")).trim();
        if (text) {
          cleanup();
          onTranscript(text);
          setState("idle");
          setInterimText("");
          setFinalText("");
          setBarHeights(Array(24).fill(4));
        } else {
          cleanup();
          setState("idle");
          setBarHeights(Array(24).fill(4));
        }
      }
    };

    recognition.start();
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const text = (finalText + (interimText ? " " + interimText : "")).trim();
    cleanup();
    setBarHeights(Array(24).fill(4));

    if (text) {
      onTranscript(text);
      setState("idle");
      setInterimText("");
      setFinalText("");
    } else {
      setState("idle");
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice not supported in this browser"
        className={`${
          size === "lg"
            ? "h-20 w-20 rounded-full"
            : "h-8 w-8 rounded-xl"
        } bg-[#e2dcd1]/50 flex items-center justify-center text-[#b1ada5] cursor-not-allowed`}
      >
        <svg width={size === "lg" ? 28 : 14} height={size === "lg" ? 28 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setState("idle"); setErrorMessage(""); }}
          className={`${
            size === "lg"
              ? "h-20 w-20 rounded-full"
              : "h-8 w-8 rounded-xl"
          } bg-[#b41340]/10 flex items-center justify-center text-[#b41340] hover:bg-[#b41340]/20 transition-colors`}
          title={errorMessage}
        >
          <svg width={size === "lg" ? 28 : 14} height={size === "lg" ? 28 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        {size === "lg" && (
          <p className="text-sm text-[#b41340]">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-8" aria-label="Audio waveform">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-[#8d4837] transition-all duration-75"
              style={{ height: `${h}px`, opacity: 0.5 + (h / 64) * 0.5 }}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="text-xs text-[#7a766f] font-mono tabular-nums min-w-[36px]">
          {formatTime(timer)}
        </span>

        {/* Interim transcript preview */}
        {(finalText || interimText) && size === "lg" && (
          <p className="text-sm text-[#7a766f] italic max-w-[200px] truncate">
            {finalText}{interimText ? ` ${interimText}` : ""}
          </p>
        )}

        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className={`${
            size === "lg"
              ? "h-14 w-14 rounded-full"
              : "h-8 w-8 rounded-xl"
          } bg-[#b41340] flex items-center justify-center text-white hover:bg-[#9a0f36] transition-colors animate-pulse`}
          title="Stop recording"
        >
          <div className={`${size === "lg" ? "w-5 h-5" : "w-3 h-3"} rounded-sm bg-white`} />
        </button>
      </div>
    );
  }

  // Idle state — microphone button
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={`${
        size === "lg"
          ? "h-20 w-20 rounded-full shadow-lg hover:shadow-xl"
          : "h-8 w-8 rounded-xl"
      } bg-gradient-to-br from-[#8d4837] to-[#6d2e20] flex items-center justify-center text-white hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none`}
      title="Start voice recording"
    >
      <svg width={size === "lg" ? 32 : 14} height={size === "lg" ? 32 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
