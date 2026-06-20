import { useEffect, useRef, useState } from "react";

/**
 * Voice input by recording the microphone and transcribing the audio. This
 * replaces the Web Speech API, which starts but never returns a result inside
 * a desktop webview (it reports "no speech" even with a working microphone).
 *
 * getUserMedia and MediaRecorder do work in the webview once microphone access
 * is granted, so we capture audio and hand the blob to a transcribe function.
 */
export type VoiceState = "idle" | "recording" | "transcribing";

interface VoiceHandlers {
  transcribe: (blob: Blob) => Promise<string>;
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

interface VoiceInput {
  supported: boolean;
  state: VoiceState;
  toggle: () => void;
}

export function useVoiceInput({
  transcribe,
  onResult,
  onError,
}: VoiceHandlers): VoiceInput {
  const [state, setState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const handlers = useRef({ transcribe, onResult, onError });
  handlers.current = { transcribe, onResult, onError };

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore teardown errors
      }
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
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
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setState("idle");
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
