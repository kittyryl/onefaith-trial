"use client";

import React from "react";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerColor = "amber" | "blue" | "emerald" | "rose" | "gray";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  thickness?: 2 | 3 | 4;
  label?: string;
  className?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const colorClass: Record<SpinnerColor, string> = {
  amber: "border-t-amber-600",
  blue: "border-t-blue-600",
  emerald: "border-t-emerald-600",
  rose: "border-t-rose-600",
  gray: "border-t-gray-600",
};

export default function Spinner({
  size = "md",
  color = "amber",
  thickness = 4,
  label,
  className = "",
}: SpinnerProps) {
  const thicknessClass =
    thickness === 2 ? "border-2" : thickness === 3 ? "border-[3px]" : "border-4";

  return (
    <div className={`flex items-center ${label ? "space-x-3" : ""} ${className}`.trim()}>
      <span
        className={`inline-block ${sizeClass[size]} animate-spin rounded-full ${thicknessClass} border-gray-300 ${colorClass[color]}`}
      />
      {label && <span className="text-gray-600 text-sm">{label}</span>}
    </div>
  );
}
