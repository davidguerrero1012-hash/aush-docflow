"use client";

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Check, AlertTriangle, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ConfidenceFieldProps {
  label: string;
  confidence: number;
  fieldName: string;
  onEdit?: (fieldName: string) => void;
}

function getConfidenceInfo(confidence: number, wasEdited: boolean) {
  if (wasEdited) {
    return {
      icon: Pencil,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      label: "Manually edited",
    };
  }
  if (confidence >= 95) {
    return {
      icon: Check,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      label: `${confidence}% confidence`,
    };
  }
  if (confidence >= 70) {
    return {
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      label: `${confidence}% confidence - please verify`,
    };
  }
  return {
    icon: X,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: `${confidence}% confidence - needs review`,
  };
}

export function ConfidenceField({
  label,
  confidence,
  fieldName,
  onEdit,
}: ConfidenceFieldProps) {
  const { register } = useFormContext();
  const [wasEdited, setWasEdited] = useState(false);
  const confidenceId = `${fieldName}-confidence`;

  const info = getConfidenceInfo(confidence, wasEdited);
  const Icon = info.icon;

  const handleChange = useCallback(() => {
    if (!wasEdited) {
      setWasEdited(true);
      onEdit?.(fieldName);
    }
  }, [wasEdited, fieldName, onEdit]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldName} className="text-sm font-medium text-zinc-900">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={fieldName}
          aria-describedby={confidenceId}
          className={cn(
            "h-11 rounded-lg pr-24 text-[15px] placeholder:text-zinc-400",
            "focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500",
            "border-zinc-200"
          )}
          {...register(fieldName)}
          onChange={(e) => {
            register(fieldName).onChange(e);
            handleChange();
          }}
        />
        {/* Confidence badge */}
        <div
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
            info.bgColor,
            info.color,
            info.borderColor
          )}
        >
          <Icon className="h-3 w-3" />
          <span className="hidden sm:inline">
            {wasEdited ? "Edited" : `${confidence}%`}
          </span>
        </div>
      </div>
      <p id={confidenceId} className="sr-only">
        {info.label}
      </p>
    </div>
  );
}
