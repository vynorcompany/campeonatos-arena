"use client";
import { elementVisualScale } from "@/lib/ui/element-visual-scale";
import { cx } from "@/lib/ui/classes";

import { useRef, useState } from "react";

type CalendarDragScrollProps = {
  children: React.ReactNode;
  className?: string;
  dragFromControls?: boolean;
};

export function CalendarDragScroll({ children, className, dragFromControls = false }: CalendarDragScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ pointerId: number; startX: number; startScrollLeft: number; visualScale: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  return (
    <div
      ref={ref}
      className={cx(`${className ?? ""}${isDragging ? " calendar-dragging" : ""}`)}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (event.pointerType !== "mouse" || event.button !== 0 || (!dragFromControls && target.closest("button,input,select,textarea,label,a"))) return;
        const element = ref.current;
        if (!element) return;
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startScrollLeft: element.scrollLeft,
          visualScale: elementVisualScale(element),
          moved: false
        };
      }}
      onPointerMove={(event) => {
        const element = ref.current;
        const current = dragState.current;
        if (!element || !current || current.pointerId !== event.pointerId) return;
        const delta = event.clientX - current.startX;
        if (!current.moved && Math.abs(delta) > 6) {
          current.moved = true;
          setIsDragging(true);
          element.setPointerCapture(event.pointerId);
        }
        if (!current.moved) return;
        element.scrollLeft = current.startScrollLeft - delta / current.visualScale;
      }}
      onPointerUp={(event) => {
        const element = ref.current;
        const current = dragState.current;
        if (!element || !current || current.pointerId !== event.pointerId) return;
        if (current.moved) {
          suppressClickRef.current = true;
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
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
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
