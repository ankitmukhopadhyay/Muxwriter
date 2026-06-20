import { useEffect, useRef, useState } from "react";

/**
 * Voice input via the Web Speech API (speech to text). Voice is input only;
 * the partner's replies stay text.
 *
 * Inside a desktop webview the Web Speech API is fragile: the microphone
 * permission must be granted and the speech service must be reachable, and
 * failures are otherwise silent. So this hook primes the microphone permission
 * up front, streams interim results so text appears while speaking, and
 * surfaces a readable error rather than failing quietly.
 */
interface SpeechHandlers {
  /** Called with the cumulative transcript (interim included) during a session. */
  onResult: (transcript: string) => void;
  /** Called with a readable message when voice input cannot run. */
  onError: (message: string) => void;
}

interface SpeechInput {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
}

function getRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access is blocked. Allow microphone access for Muxwriter and try again.",
  "service-not-allowed":
    "Speech recognition is unavailable in this app build.",
  network: "Speech recognition needs an internet connection.",
  "no-speech": "Did not catch that. Try speaking again.",
  "audio-capture": "No microphone was found.",
};

export function useSpeechInput({
  onResult,
  onError,
}: SpeechHandlers): SpeechInput {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const handlers = useRef({ onResult, onError });
  handlers.current = { onResult, onError };

  const supported = getRecognitionCtor() !== null;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore teardown errors
      }
    };
  }, []);

  const begin = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlers.current.onError("Voice input is not supported here.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    finalRef.current = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      handlers.current.onResult((finalRef.current + interim).trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event: any) => {
      setListening(false);
      const code = event?.error as string;
      handlers.current.onError(
        ERROR_MESSAGES[code] ?? "Voice input stopped unexpectedly.",
      );
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      handlers.current.onError("Could not start voice input.");
    }
  };

  const start = () => {
    if (listening) return;
    // Prime the microphone permission so the webview prompts and any block
    // surfaces as a clear message instead of a silent failure.
    const md = navigator.mediaDevices;
    if (md?.getUserMedia) {
      md.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          begin();
        })
        .catch(() => {
          handlers.current.onError(
            "Microphone access is blocked. Allow microphone access for Muxwriter and try again.",
          );
        });
    } else {
      // No mediaDevices in this webview; try recognition directly so any
      // failure still surfaces through onerror.
      begin();
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  return { supported, listening, start, stop };
}
