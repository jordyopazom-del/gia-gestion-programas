"use client";

import React from "react";
import toast from "react-hot-toast";

interface CopyBadgeProps {
  value: string | number | null | undefined;
  label: string;
  formattedText?: string;
  className?: string;
  prefixIcon?: React.ReactNode;
  title?: string;
}

export function CopyBadge({
  value,
  label,
  formattedText,
  className = "font-mono font-bold bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 transition-colors cursor-copy inline-flex items-center",
  prefixIcon,
  title,
}: CopyBadgeProps) {
  if (!value) return null;

  const copyString = String(value).trim();
  const displayText = formattedText ?? copyString;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(copyString);
    toast.success(`${label} copiado al portapapeles`, {
      id: `copy-${label}`,
      style: { fontSize: "12px", padding: "8px" },
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      title={title || `Clic para copiar ${label}`}
    >
      {prefixIcon && <span className="mr-1">{prefixIcon}</span>}
      {displayText}
    </button>
  );
}
