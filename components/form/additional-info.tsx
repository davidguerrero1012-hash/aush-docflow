"use client";

import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IntakeFormData } from "@/types";

export function AdditionalInfo() {
 const {
  register,
  formState: { errors },
  control,
 } = useFormContext<IntakeFormData>();

 const firstInputRef = useRef<HTMLInputElement | null>(null);

 const notesValue = useWatch({
  control,
  name: "additionalInfo.additionalNotes",
  defaultValue: "",
 });

 const charCount = (notesValue || "").length;

 useEffect(() => {
  const timer = setTimeout(() => {
   firstInputRef.current?.focus();
  }, 300);
  return () => clearTimeout(timer);
 }, []);

 function getError(path: string): string | undefined {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = errors;
  for (const part of parts) {
   current = current?.[part];
  }
  return current?.message as string | undefined;
 }

 const insuranceReg = register("additionalInfo.insuranceProvider");
 const policyReg = register("additionalInfo.policyNumber");
 const dependentsReg = register("additionalInfo.dependentsCount", {
  valueAsNumber: true,
 });
 const notesReg = register("additionalInfo.additionalNotes");

 return (
  <div className="space-y-1">
   <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="mb-6"
   >
    <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
     Additional Information
    </h2>
    <p className="mt-1 text-sm text-zinc-500">
     These fields are optional but help us process your application faster.
    </p>
   </motion.div>

   <div className="space-y-5">
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
     {/* Insurance Provider */}
     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="insuranceProvider" className="text-sm font-medium text-zinc-900">
        Insurance Provider
        <span className="ml-1 text-xs text-zinc-400">(optional)</span>
       </Label>
       <Input
        id="insuranceProvider"
        placeholder="Blue Cross Blue Shield"
        className="h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
        {...insuranceReg}
        ref={(e) => {
         insuranceReg.ref(e);
         firstInputRef.current = e;
        }}
       />
      </div>
     </motion.div>

     {/* Policy Number */}
     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="policyNumber" className="text-sm font-medium text-zinc-900">
        Policy Number
        <span className="ml-1 text-xs text-zinc-400">(optional)</span>
       </Label>
       <Input
        id="policyNumber"
        placeholder="ABC-123456789"
        className="h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
        {...policyReg}
       />
      </div>
     </motion.div>
    </div>

    {/* Dependents Count */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0.1 }}
    >
     <div className="space-y-1.5 max-w-xs">
      <Label htmlFor="dependentsCount" className="text-sm font-medium text-zinc-900">
       Number of Dependents
      </Label>
      <Input
       id="dependentsCount"
       type="number"
       min={0}
       inputMode="numeric"
       placeholder="0"
       aria-invalid={!!getError("additionalInfo.dependentsCount")}
       className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
        getError("additionalInfo.dependentsCount") ? "border-red-500" : ""
       }`}
       {...dependentsReg}
      />
      {getError("additionalInfo.dependentsCount") && (
       <p className="text-[13px] text-red-500" role="alert">
        {getError("additionalInfo.dependentsCount")}
       </p>
      )}
     </div>
    </motion.div>

    {/* Additional Notes */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0.15 }}
    >
     <div className="space-y-1.5">
      <div className="flex items-center justify-between">
       <Label htmlFor="additionalNotes" className="text-sm font-medium text-zinc-900">
        Additional Notes
        <span className="ml-1 text-xs text-zinc-400">(optional)</span>
       </Label>
       <span
        className={`text-xs tabular-nums ${
         charCount > 1900 ? "text-amber-500" : "text-zinc-400"
        } ${charCount >= 2000 ? "text-red-500 font-medium" : ""}`}
       >
        {charCount}/2,000
       </span>
      </div>
      <Textarea
       id="additionalNotes"
       placeholder="Any additional information you'd like to share..."
       maxLength={2000}
       rows={4}
       aria-invalid={!!getError("additionalInfo.additionalNotes")}
       className={` border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
        getError("additionalInfo.additionalNotes") ? "border-red-500" : ""
       }`}
       {...notesReg}
      />
      {getError("additionalInfo.additionalNotes") && (
       <p className="text-[13px] text-red-500" role="alert">
        {getError("additionalInfo.additionalNotes")}
       </p>
      )}
     </div>
    </motion.div>
   </div>
  </div>
 );
}
