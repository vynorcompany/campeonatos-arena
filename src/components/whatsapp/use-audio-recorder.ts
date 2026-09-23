"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderResult = { file: File; previewUrl: string };

export function useAudioRecorder({ onReady, onError }: { onReady: (result: RecorderResult) => void; onError: (message: string) => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);

  const stop = useCallback(() => recorder.current?.stop(), []);

  const start = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Use uma conexão HTTPS e um navegador compatível para gravar áudio.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mediaRecorder = new MediaRecorder(mediaStream);
      stream.current = mediaStream;
      recorder.current = mediaRecorder;

      if (window.AudioContext) {
        const context = new window.AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 64;
        context.createMediaStreamSource(mediaStream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const renderLevel = () => {
          analyser.getByteFrequencyData(samples);
          setLevel(samples.reduce((total, item) => total + item, 0) / (samples.length * 255));
          frame.current = window.requestAnimationFrame(renderLevel);
        };
        audioContext.current = context;
        void context.resume().catch(() => {});
        renderLevel();
      }

      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      mediaRecorder.onstop = () => {
        if (frame.current !== null) window.cancelAnimationFrame(frame.current);
        frame.current = null;
        void audioContext.current?.close().catch(() => {});
        audioContext.current = null;
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
        setRecording(false);
        setLevel(0);
        const type = mediaRecorder.mimeType || "audio/webm";
        const file = new File([new Blob(chunks, { type })], "audio.webm", { type });
        onReady({ file, previewUrl: URL.createObjectURL(file) });
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      onError(name === "NotAllowedError" ? "O navegador bloqueou o microfone. Clique no cadeado ao lado do endereço, permita o Microfone e tente novamente." : "Não foi possível abrir o microfone. Verifique a permissão do navegador.");
    }
  }, [onError, onReady]);

  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    void audioContext.current?.close().catch(() => {});
  }, []);

  return { recording, level, start, stop };
}
