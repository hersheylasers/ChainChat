"use client";

import React from "react";

interface BadgeProps {
  variant?: "success" | "secondary";
  children: React.ReactNode;
}

export function Badge({ variant = "secondary", children }: BadgeProps) {
  const baseStyles = "px-2 py-1 rounded text-sm font-medium";
  const variantStyles =
    variant === "success" ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300";

  return <span className={`${baseStyles} ${variantStyles}`}>{children}</span>;
}
