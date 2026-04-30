"use client";

import { useRef } from "react";

type TimePickerInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
};

export function TimePickerInput({ id, name, defaultValue }: TimePickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.showPicker?.();
  }

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="time"
      defaultValue={defaultValue}
      className="time-picker-input"
      onClick={openPicker}
      onFocus={openPicker}
    />
  );
}
