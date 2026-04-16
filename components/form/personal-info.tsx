"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntakeFormData } from "@/types";

const fields = [
  { name: "personalInfo.firstName", label: "First Name", type: "text", placeholder: "John" },
  { name: "personalInfo.lastName", label: "Last Name", type: "text", placeholder: "Doe" },
  { name: "personalInfo.dateOfBirth", label: "Date of Birth", type: "date", placeholder: "" },
  { name: "personalInfo.ssnLast4", label: "SSN (Last 4 Digits)", type: "password", placeholder: "0000", inputMode: "numeric" as const, maxLength: 4 },
  { name: "personalInfo.phone", label: "Phone Number", type: "tel", placeholder: "(555) 123-4567" },
  { name: "personalInfo.email", label: "Email Address", type: "email", placeholder: "john@example.com" },
] as const;

export function PersonalInfo() {
  const {
    register,
    formState: { errors },
  } = useFormContext<IntakeFormData>();

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  function getError(fieldPath: string): string | undefined {
    const parts = fieldPath.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = errors;
    for (const part of parts) {
      current = current?.[part];
    }
    return current?.message as string | undefined;
  }

  return (
    <div className="space-y-1">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Please provide your basic personal details.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field, index) => {
          const error = getError(field.name);
          const isSSN = field.name === "personalInfo.ssnLast4";
          const isDate = field.type === "date";
          const registration = register(
            field.name as keyof IntakeFormData extends never
              ? string
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              : any,
            isSSN
              ? {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  },
                }
              : undefined
          );

          return (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={
                field.name === "personalInfo.email" ||
                field.name === "personalInfo.phone"
                  ? "sm:col-span-1"
                  : undefined
              }
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor={field.name}
                  className="text-sm font-medium text-zinc-900"
                >
                  {field.label}
                </Label>
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  inputMode={
                    isSSN ? "numeric" : undefined
                  }
                  maxLength={isSSN ? 4 : undefined}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  className={`h-11 rounded-lg border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 ${
                    error
                      ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                      : ""
                  } ${isDate ? "appearance-none" : ""}`}
                  {...registration}
                  ref={(e) => {
                    registration.ref(e);
                    if (index === 0) {
                      firstInputRef.current = e;
                    }
                  }}
                />
                {error && (
                  <p
                    id={`${field.name}-error`}
                    className="text-[13px] text-red-500"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
