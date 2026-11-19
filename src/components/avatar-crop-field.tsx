"use client";
import { viewStyles } from "./avatar-crop-field.utilities";

import { useEffect, useRef, useState } from "react";

type ImageMeta = { src: string; width: number; height: number };

export function AvatarCropField({ currentPhotoUrl, name, compact = false, appearance = "default", showHints = true }: { currentPhotoUrl: string; name: string; compact?: boolean; appearance?: "default" | "profile"; showHints?: boolean }) {
  const size = appearance === "profile" ? 64 : compact ? 112 : 224;
  const [image, setImage] = useState<ImageMeta | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [currentPhotoFailed, setCurrentPhotoFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const chooseInputRef = useRef<HTMLInputElement>(null);
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
  }, [image, offset, previewReady, scale, size]);

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

  return <div className={appearance === "profile" ? "tw:grid tw:min-w-0 tw:grid-cols-[64px_minmax(0,1fr)] tw:items-center tw:gap-4" : viewStyles.avatar_crop_field}><input ref={outputRef} name="photo" type="file" className={viewStyles.avatar_crop_output} tabIndex={-1} aria-hidden="true" /><div className={appearance === "profile" ? "tw:relative tw:grid tw:size-16 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-full tw:bg-[#174983] tw:text-xl tw:font-medium tw:text-white tw:touch-none tw:select-none tw:[&_img]:absolute tw:[&_img]:max-w-none tw:[&_img]:[transform:translate(-50%,-50%)] tw:[&_img.avatar-crop-current-photo]:inset-0 tw:[&_img.avatar-crop-current-photo]:size-full tw:[&_img.avatar-crop-current-photo]:object-cover tw:[&_img.avatar-crop-current-photo]:transform-none" : `${viewStyles.avatar_crop_preview} ${compact ? "tw:size-28!" : ""}`} onPointerDown={(event) => { if (!image) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, offset }; }} onPointerMove={(event) => { if (!drag.current) return; setOffset(clamp({ x: drag.current.offset.x + event.clientX - drag.current.x, y: drag.current.offset.y + event.clientY - drag.current.y })); }} onPointerUp={() => { drag.current = null; }}>
    {image ? <img ref={previewRef} src={image.src} alt="Prévia do avatar" draggable={false} onLoad={() => setPreviewReady(true)} style={{ width: image.width * scale, height: image.height * scale, left: size / 2 + offset.x, top: size / 2 + offset.y }} /> : currentPhotoUrl && !currentPhotoFailed ? <img className="avatar-crop-current-photo" src={currentPhotoUrl} alt="Foto de perfil atual" onError={() => setCurrentPhotoFailed(true)} /> : <span>{initials}</span>}
  </div><div className={appearance === "profile" ? "tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2" : viewStyles.avatar_crop_controls}>{appearance === "profile" ? <span className="tw:block tw:w-full tw:break-words tw:text-sm tw:font-medium">{name}</span> : null}<label tabIndex={appearance === "profile" ? 0 : undefined} onKeyDown={event => { if (appearance === "profile" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); chooseInputRef.current?.click(); } }} className={appearance === "profile" ? "tw:inline-flex tw:min-h-8 tw:cursor-pointer tw:items-center tw:text-xs tw:text-[#174983] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:text-[#a5caff] tw:dark:focus-visible:outline-[#a5caff] tw:[&_input]:hidden" : viewStyles.button_button_small}>{appearance === "profile" ? "Alterar foto" : "Escolher foto"}<input ref={chooseInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} /></label>{image ? <span className={appearance === "profile" ? "tw:flex tw:w-full tw:min-w-0 tw:items-center tw:gap-2" : "tw:contents"}><button type="button" className={viewStyles.button_button_small} onClick={() => changeZoom(zoom - .1)} aria-label="Diminuir zoom">−</button><label className={appearance === "profile" ? "tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-1 tw:text-xs tw:[&_input]:w-full tw:[&_input]:min-w-0" : viewStyles.avatar_crop_zoom}>Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} /></label><button type="button" className={viewStyles.button_button_small} onClick={() => changeZoom(zoom + .1)} aria-label="Aumentar zoom">+</button></span> : null}</div>{showHints ? image ? <small>Arraste a foto para centralizar. Use o zoom para ajustar o enquadramento.</small> : <small>Use uma foto quadrada ou retangular; ela será ajustada ao avatar.</small> : null}</div>;
}
