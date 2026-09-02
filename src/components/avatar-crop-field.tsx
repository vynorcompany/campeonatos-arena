"use client";

import { useEffect, useRef, useState } from "react";

const size = 224;
type ImageMeta = { src: string; width: number; height: number };

export function AvatarCropField({ currentPhotoUrl, name }: { currentPhotoUrl: string; name: string }) {
  const [image, setImage] = useState<ImageMeta | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [currentPhotoFailed, setCurrentPhotoFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const outputRef = useRef<HTMLInputElement>(null);
  const scale = image ? Math.max(size / image.width, size / image.height) * zoom : 1;
  const clamp = (next: { x: number; y: number }, currentScale = scale) => image ? { x: Math.max(-(image.width * currentScale - size) / 2, Math.min((image.width * currentScale - size) / 2, next.x)), y: Math.max(-(image.height * currentScale - size) / 2, Math.min((image.height * currentScale - size) / 2, next.y)) } : next;

  useEffect(() => () => { if (image?.src.startsWith("blob:")) URL.revokeObjectURL(image.src); }, [image?.src]);
  useEffect(() => {
    const element = previewRef.current;
    if (!image || !previewReady || !element?.complete || !outputRef.current) return;
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext("2d"); if (!context) return;
    const ratio = canvas.width / size;
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(element, (size / 2 + offset.x - image.width * scale / 2) * ratio, (size / 2 + offset.y - image.height * scale / 2) * ratio, image.width * scale * ratio, image.height * scale * ratio);
    canvas.toBlob((blob) => { if (!blob || !outputRef.current) return; const data = new DataTransfer(); data.items.add(new File([blob], "avatar.jpg", { type: "image/jpeg" })); outputRef.current.files = data.files; }, "image/jpeg", .9);
  }, [image, offset, previewReady, scale]);

  const selectImage = (file?: File) => {
    if (!file) return;
    if (outputRef.current) {
      const data = new DataTransfer(); data.items.add(file); outputRef.current.files = data.files;
    }
    const src = URL.createObjectURL(file); const element = new Image();
    element.onload = () => { setPreviewReady(false); setImage({ src, width: element.naturalWidth, height: element.naturalHeight }); setZoom(1); setOffset({ x: 0, y: 0 }); };
    element.src = src;
  };
  const changeZoom = (value: number) => { const nextZoom = Math.max(1, Math.min(3, value)); setZoom(nextZoom); if (image) { const nextScale = Math.max(size / image.width, size / image.height) * nextZoom; setOffset((current) => clamp(current, nextScale)); } };
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

  return <div className="avatar-crop-field"><input ref={outputRef} name="photo" type="file" className="avatar-crop-output" tabIndex={-1} aria-hidden="true" /><div className="avatar-crop-preview" onPointerDown={(event) => { if (!image) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, offset }; }} onPointerMove={(event) => { if (!drag.current) return; setOffset(clamp({ x: drag.current.offset.x + event.clientX - drag.current.x, y: drag.current.offset.y + event.clientY - drag.current.y })); }} onPointerUp={() => { drag.current = null; }}>
    {image ? <img ref={previewRef} src={image.src} alt="Prévia do avatar" draggable={false} onLoad={() => setPreviewReady(true)} style={{ width: image.width * scale, height: image.height * scale, left: size / 2 + offset.x, top: size / 2 + offset.y }} /> : currentPhotoUrl && !currentPhotoFailed ? <img className="avatar-crop-current-photo" src={currentPhotoUrl} alt="Foto de perfil atual" onError={() => setCurrentPhotoFailed(true)} /> : <span>{initials}</span>}
  </div><div className="avatar-crop-controls"><label className="button button-small">Escolher foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} /></label>{image ? <><button type="button" className="button button-small" onClick={() => changeZoom(zoom - .1)} aria-label="Diminuir zoom">−</button><label className="avatar-crop-zoom">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} /></label><button type="button" className="button button-small" onClick={() => changeZoom(zoom + .1)} aria-label="Aumentar zoom">+</button></> : null}</div>{image ? <small>Arraste a foto para centralizar. Use o zoom para ajustar o enquadramento.</small> : <small>Use uma foto quadrada ou retangular; ela será ajustada ao avatar.</small>}</div>;
}
