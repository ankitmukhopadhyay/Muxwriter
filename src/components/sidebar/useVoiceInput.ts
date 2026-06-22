import { useEffect, useRef, useState } from "react";

/**
 * Live voice input. Records the microphone and, while recording, periodically
 * transcribes the audio captured so far so the text appears as the writer
 * speaks rather than only after they stop. A final pass on stop gives the most
 * accurate transcript.
 *
 * The Web Speech API is not used: it starts but never returns a result inside
 * a desktop webview. getUserMedia and MediaRecorder do work once microphone
 * access is granted, and transcription goes to OpenAI.
 */
export type VoiceState = "idle" | "recording" | "transcribing";

interface VoiceHandlers {
  transcribe: (blob: Blob) => Promise<string>;
  /** Live transcript updates while recording (the full text so far). */
  onPartial: (text: string) => void;
  /** Final transcript when recording stops. */
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

interface VoiceInput {
  supported: boolean;
  state: VoiceState;
  toggle: () => void;
}

/** How often to re-transcribe the audio so far for the live preview. */
const LIVE_INTERVAL_MS = 1500;

export function useVoiceInput({
  transcribe,
  onPartial,
  onResult,
  onError,
}: VoiceHandlers): VoiceInput {
  const [state, setState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const handlers = useRef({ transcribe, onPartial, onResult, onError });
  handlers.current = { transcribe, onPartial, onResult, onError };

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      cleanup();
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) {
          setState("idle");
          handlers.current.onError("No audio was captured. Try again.");
          return;
        }
        setState("transcribing");
        try {
          const text = await handlers.current.transcribe(blob);
          if (text) handlers.current.onResult(text);
          else handlers.current.onError("Did not catch any speech. Try again.");
        } catch (err) {
          handlers.current.onError(
            err instanceof Error ? err.message : "Transcription failed.",
          );
        } finally {
          setState("idle");
        }
      };

      recorder.start(500); // emit a chunk every 500ms to build the live clip
      setState("recording");

      // Live preview: re-transcribe the audio so far on an interval.
      timerRef.current = setInterval(async () => {
        if (busyRef.current || chunksRef.current.length === 0) return;
        if (recorderRef.current?.state !== "recording") return;
        busyRef.current = true;
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const text = await handlers.current.transcribe(blob);
          if (text && recorderRef.current?.state === "recording") {
            handlers.current.onPartial(text);
          }
        } catch {
          // Ignore transient partial errors; the final pass surfaces real ones.
        } finally {
          busyRef.current = false;
        }
      }, LIVE_INTERVAL_MS);
    } catch {
      setState("idle");
      cleanup();
      handlers.current.onError(
        "Microphone access is blocked. Allow microphone access for Muxwriter and try again.",
      );
    }
  };

  const stop = () => {
    if (recorderRef.current && state === "recording") {
      recorderRef.current.stop();
    }
  };

  const toggle = () => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  };

  return { supported, state, toggle };
}
