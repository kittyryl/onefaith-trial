"use client";

import React from "react";
import Spinner from "./Spinner";

interface PageLoaderProps {
  message?: string;
  color?: "amber" | "blue" | "emerald" | "rose" | "gray";
}

export default function PageLoader({
  message = "Loading...",
  color = "amber",
}: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center p-6">
      <Spinner size="lg" color={color} label={message} />
    </div>
  );
}
