"use client";

import { useRef, useState } from "react";

type CalendarDragScrollProps = {
  children: React.ReactNode;
  className?: string;
};

export function CalendarDragScroll({ children, className }: CalendarDragScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);

  return (
    <div
      ref={ref}
      className={`${className ?? ""}${isDragging ? " calendar-dragging" : ""}`}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button,input,select,textarea,label,a")) return;
        const element = ref.current;
        if (!element) return;
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startScrollLeft: element.scrollLeft
        };
        element.setPointerCapture(event.pointerId);
        setIsDragging(true);
      }}
      onPointerMove={(event) => {
        const element = ref.current;
        const current = dragState.current;
        if (!element || !current || current.pointerId !== event.pointerId) return;
        const delta = event.clientX - current.startX;
        element.scrollLeft = current.startScrollLeft - delta;
      }}
      onPointerUp={(event) => {
        const element = ref.current;
        const current = dragState.current;
        if (!element || !current || current.pointerId !== event.pointerId) return;
        dragState.current = null;
        setIsDragging(false);
        if (element.hasPointerCapture(event.pointerId)) {
          element.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        dragState.current = null;
        setIsDragging(false);
      }}
    >
      {children}
    </div>
  );
}

