"use client";

import React, { useState } from "react";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Switch({ checked = false, onChange }: SwitchProps) {
  const [isChecked, setIsChecked] = useState(checked);

  const toggleSwitch = () => {
    const newState = !isChecked;
    setIsChecked(newState);
    if (onChange) onChange(newState);
  };

  return (
    <button
      onClick={toggleSwitch}
      className={`relative w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
        isChecked ? "bg-green-500" : "bg-gray-600"
      }`}
    >
      <span
        className={`absolute w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
          isChecked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
