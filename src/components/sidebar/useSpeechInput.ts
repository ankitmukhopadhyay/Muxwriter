import { useEffect, useRef, useState } from "react";

/**
 * Voice input via the Web Speech API (speech to text). Voice is input only;
 * the partner's replies stay text. Transcribed text is delivered through
 * onResult so the composer can drop it into the text box. Gracefully reports
 * unsupported so the mic can be hidden where the API is unavailable.
 */
interface SpeechInput {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
}

// The Web Speech API is not in the standard TS DOM lib; access it loosely.
function getRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechInput(onResult: (text: string) => void): SpeechInput {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

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

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || listening) return;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (transcript) onResultRef.current(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
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
