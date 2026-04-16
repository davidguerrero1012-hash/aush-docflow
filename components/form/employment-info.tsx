"use client";

import { useEffect, useRef, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import type { IntakeFormData } from "@/types";

const EMPLOYMENT_STATUSES = [
 { value: "employed", label: "Employed" },
 { value: "self-employed", label: "Self-Employed" },
 { value: "unemployed", label: "Unemployed" },
 { value: "retired", label: "Retired" },
 { value: "student", label: "Student" },
] as const;

function formatCurrency(value: string): string {
 const digits = value.replace(/[^\d]/g, "");
 if (!digits) return "";
 return Number(digits).toLocaleString("en-US");
}

function parseCurrency(value: string): number {
 const digits = value.replace(/[^\d]/g, "");
 return digits ? Number(digits) : 0;
}

export function EmploymentInfo() {
 const {
  register,
  setValue,
  formState: { errors },
  control,
 } = useFormContext<IntakeFormData>();

 const firstInputRef = useRef<HTMLInputElement | null>(null);
 const incomeDisplayRef = useRef<HTMLInputElement | null>(null);

 const statusValue = useWatch({
  control,
  name: "employmentInfo.employmentStatus",
 });

 const incomeValue = useWatch({
  control,
  name: "employmentInfo.annualIncome",
 });

 useEffect(() => {
  const timer = setTimeout(() => {
   firstInputRef.current?.focus();
  }, 300);
  return () => clearTimeout(timer);
 }, []);

 // Set the display value for income when component mounts or value changes
 useEffect(() => {
  if (incomeDisplayRef.current && incomeValue !== undefined && document.activeElement !== incomeDisplayRef.current) {
   incomeDisplayRef.current.value = incomeValue ? formatCurrency(String(incomeValue)) : "";
  }
 }, [incomeValue]);

 function getError(path: string): string | undefined {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = errors;
  for (const part of parts) {
   current = current?.[part];
  }
  return current?.message as string | undefined;
 }

 const handleIncomeBlur = useCallback(() => {
  if (incomeDisplayRef.current) {
   const val = incomeDisplayRef.current.value;
   incomeDisplayRef.current.value = formatCurrency(val);
  }
 }, []);

 const handleIncomeChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
   const numVal = parseCurrency(e.target.value);
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   setValue("employmentInfo.annualIncome" as any, numVal, {
    shouldValidate: true,
   });
  },
  [setValue]
 );

 const employerReg = register("employmentInfo.employerName");
 const occupationReg = register("employmentInfo.occupation");

 return (
  <div className="space-y-1">
   <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="mb-6"
   >
    <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
     Employment Information
    </h2>
    <p className="mt-1 text-sm text-zinc-500">
     Tell us about your current employment.
    </p>
   </motion.div>

   <div className="space-y-5">
    {/* Employer Name */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0 }}
    >
     <div className="space-y-1.5">
      <Label htmlFor="employerName" className="text-sm font-medium text-zinc-900">
       Employer Name
      </Label>
      <Input
       id="employerName"
       placeholder="Acme Corp"
       aria-invalid={!!getError("employmentInfo.employerName")}
       className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
        getError("employmentInfo.employerName") ? "border-red-500" : ""
       }`}
       {...employerReg}
       ref={(e) => {
        employerReg.ref(e);
        firstInputRef.current = e;
       }}
      />
      {getError("employmentInfo.employerName") && (
       <p className="text-[13px] text-red-500" role="alert">
        {getError("employmentInfo.employerName")}
       </p>
      )}
     </div>
    </motion.div>

    {/* Occupation */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0.05 }}
    >
     <div className="space-y-1.5">
      <Label htmlFor="occupation" className="text-sm font-medium text-zinc-900">
       Occupation
      </Label>
      <Input
       id="occupation"
       placeholder="Software Engineer"
       aria-invalid={!!getError("employmentInfo.occupation")}
       className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
        getError("employmentInfo.occupation") ? "border-red-500" : ""
       }`}
       {...occupationReg}
      />
      {getError("employmentInfo.occupation") && (
       <p className="text-[13px] text-red-500" role="alert">
        {getError("employmentInfo.occupation")}
       </p>
      )}
     </div>
    </motion.div>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
     {/* Annual Income */}
     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="annualIncome" className="text-sm font-medium text-zinc-900">
        Annual Income
       </Label>
       <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[15px]">
         $
        </span>
        <Input
         id="annualIncome"
         inputMode="decimal"
         placeholder="75,000"
         aria-invalid={!!getError("employmentInfo.annualIncome")}
         className={`h-11 pl-7 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
          getError("employmentInfo.annualIncome") ? "border-red-500" : ""
         }`}
         ref={incomeDisplayRef}
         onChange={handleIncomeChange}
         onBlur={handleIncomeBlur}
         defaultValue={incomeValue ? formatCurrency(String(incomeValue)) : ""}
        />
       </div>
       {getError("employmentInfo.annualIncome") && (
        <p className="text-[13px] text-red-500" role="alert">
         {getError("employmentInfo.annualIncome")}
        </p>
       )}
      </div>
     </motion.div>

     {/* Employment Status */}
     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="employmentStatus" className="text-sm font-medium text-zinc-900">
        Employment Status
       </Label>
       <Select
        value={statusValue || ""}
        onValueChange={(val) =>
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         setValue("employmentInfo.employmentStatus" as any, val, {
          shouldValidate: true,
         })
        }
       >
        <SelectTrigger
         id="employmentStatus"
         className={`h-11 w-full border-zinc-200 text-[15px] focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
          getError("employmentInfo.employmentStatus") ? "border-red-500" : ""
         }`}
         aria-invalid={!!getError("employmentInfo.employmentStatus")}
        >
         <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
         {EMPLOYMENT_STATUSES.map((status) => (
          <SelectItem key={status.value} value={status.value}>
           {status.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
       {getError("employmentInfo.employmentStatus") && (
        <p className="text-[13px] text-red-500" role="alert">
         {getError("employmentInfo.employmentStatus")}
        </p>
       )}
      </div>
     </motion.div>
    </div>
   </div>
  </div>
 );
}
