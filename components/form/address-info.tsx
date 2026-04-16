"use client";

import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { US_STATE_OPTIONS } from "@/lib/schemas";
import type { IntakeFormData } from "@/types";

export function AddressInfo() {
 const {
  register,
  setValue,
  formState: { errors },
  control,
 } = useFormContext<IntakeFormData>();

 const firstInputRef = useRef<HTMLInputElement | null>(null);

 const mailingSame = useWatch({
  control,
  name: "addressInfo.mailingSameAsResidential",
  defaultValue: true,
 });

 const stateValue = useWatch({
  control,
  name: "addressInfo.state",
 });

 const mailingStateValue = useWatch({
  control,
  name: "addressInfo.mailingAddress.state",
 });

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

 const streetReg = register("addressInfo.streetAddress");
 const cityReg = register("addressInfo.city");
 const zipReg = register("addressInfo.zipCode", {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
   e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5);
  },
 });

 return (
  <div className="space-y-1">
   <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="mb-6"
   >
    <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
     Address Information
    </h2>
    <p className="mt-1 text-sm text-zinc-500">
     Enter your residential address.
    </p>
   </motion.div>

   <div className="space-y-5">
    {/* Street Address */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0 }}
    >
     <div className="space-y-1.5">
      <Label htmlFor="addressInfo.streetAddress" className="text-sm font-medium text-zinc-900">
       Street Address
      </Label>
      <Input
       id="addressInfo.streetAddress"
       placeholder="123 Main St"
       aria-invalid={!!getError("addressInfo.streetAddress")}
       aria-describedby={getError("addressInfo.streetAddress") ? "street-error" : undefined}
       className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
        getError("addressInfo.streetAddress") ? "border-red-500" : ""
       }`}
       {...streetReg}
       ref={(e) => {
        streetReg.ref(e);
        firstInputRef.current = e;
       }}
      />
      {getError("addressInfo.streetAddress") && (
       <p id="street-error" className="text-[13px] text-red-500" role="alert">
        {getError("addressInfo.streetAddress")}
       </p>
      )}
     </div>
    </motion.div>

    {/* City + State + ZIP */}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="addressInfo.city" className="text-sm font-medium text-zinc-900">
        City
       </Label>
       <Input
        id="addressInfo.city"
        placeholder="Springfield"
        aria-invalid={!!getError("addressInfo.city")}
        className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
         getError("addressInfo.city") ? "border-red-500" : ""
        }`}
        {...cityReg}
       />
       {getError("addressInfo.city") && (
        <p className="text-[13px] text-red-500" role="alert">
         {getError("addressInfo.city")}
        </p>
       )}
      </div>
     </motion.div>

     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="addressInfo.state" className="text-sm font-medium text-zinc-900">
        State
       </Label>
       <Select
        value={stateValue || ""}
        onValueChange={(val) =>
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         setValue("addressInfo.state" as any, val, {
          shouldValidate: true,
         })
        }
       >
        <SelectTrigger
         id="addressInfo.state"
         className={`h-11 w-full border-zinc-200 text-[15px] focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
          getError("addressInfo.state") ? "border-red-500" : ""
         }`}
         aria-invalid={!!getError("addressInfo.state")}
        >
         <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
         {US_STATE_OPTIONS.map((state) => (
          <SelectItem key={state.value} value={state.value}>
           {state.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
       {getError("addressInfo.state") && (
        <p className="text-[13px] text-red-500" role="alert">
         {getError("addressInfo.state")}
        </p>
       )}
      </div>
     </motion.div>

     <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
     >
      <div className="space-y-1.5">
       <Label htmlFor="addressInfo.zipCode" className="text-sm font-medium text-zinc-900">
        ZIP Code
       </Label>
       <Input
        id="addressInfo.zipCode"
        placeholder="62701"
        inputMode="numeric"
        maxLength={5}
        aria-invalid={!!getError("addressInfo.zipCode")}
        className={`h-11 border-zinc-200 text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700 ${
         getError("addressInfo.zipCode") ? "border-red-500" : ""
        }`}
        {...zipReg}
       />
       {getError("addressInfo.zipCode") && (
        <p className="text-[13px] text-red-500" role="alert">
         {getError("addressInfo.zipCode")}
        </p>
       )}
      </div>
     </motion.div>
    </div>

    {/* Mailing same toggle */}
    <motion.div
     initial={{ opacity: 0, y: 12 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3, delay: 0.2 }}
    >
     <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
       type="checkbox"
       className="h-5 w-5 rounded border-zinc-300 text-blue-700 focus:ring-2 focus:ring-blue-700/20 accent-blue-700"
       checked={mailingSame ?? true}
       onChange={(e) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue("addressInfo.mailingSameAsResidential" as any, e.target.checked, {
         shouldValidate: true,
        })
       }
      />
      <span className="text-sm font-medium text-zinc-700">
       Mailing address is the same as residential
      </span>
     </label>
    </motion.div>

    {/* Mailing address fields */}
    <AnimatePresence mode="wait">
     {!mailingSame && (
      <motion.div
       key="mailing-address"
       initial={{ opacity: 0, height: 0 }}
       animate={{ opacity: 1, height: "auto" }}
       exit={{ opacity: 0, height: 0 }}
       transition={{ duration: 0.3 }}
       className="overflow-hidden"
      >
       <div className="space-y-5 border border-zinc-200 bg-zinc-50/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-900">
         Mailing Address
        </h3>

        <div className="space-y-1.5">
         <Label htmlFor="mailingStreet" className="text-sm font-medium text-zinc-900">
          Street Address
         </Label>
         <Input
          id="mailingStreet"
          placeholder="456 Oak Ave"
          className="h-11 border-zinc-200 bg-white text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
          {...register("addressInfo.mailingAddress.street")}
         />
         {getError("addressInfo.mailingAddress.street") && (
          <p className="text-[13px] text-red-500" role="alert">
           {getError("addressInfo.mailingAddress.street")}
          </p>
         )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
         <div className="space-y-1.5">
          <Label htmlFor="mailingCity" className="text-sm font-medium text-zinc-900">
           City
          </Label>
          <Input
           id="mailingCity"
           placeholder="Springfield"
           className="h-11 border-zinc-200 bg-white text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
           {...register("addressInfo.mailingAddress.city")}
          />
          {getError("addressInfo.mailingAddress.city") && (
           <p className="text-[13px] text-red-500" role="alert">
            {getError("addressInfo.mailingAddress.city")}
           </p>
          )}
         </div>

         <div className="space-y-1.5">
          <Label htmlFor="mailingState" className="text-sm font-medium text-zinc-900">
           State
          </Label>
          <Select
           value={mailingStateValue || ""}
           onValueChange={(val) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue("addressInfo.mailingAddress.state" as any, val, {
             shouldValidate: true,
            })
           }
          >
           <SelectTrigger
            id="mailingState"
            className="h-11 w-full border-zinc-200 bg-white text-[15px] focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
           >
            <SelectValue placeholder="State" />
           </SelectTrigger>
           <SelectContent>
            {US_STATE_OPTIONS.map((state) => (
             <SelectItem key={state.value} value={state.value}>
              {state.label}
             </SelectItem>
            ))}
           </SelectContent>
          </Select>
          {getError("addressInfo.mailingAddress.state") && (
           <p className="text-[13px] text-red-500" role="alert">
            {getError("addressInfo.mailingAddress.state")}
           </p>
          )}
         </div>

         <div className="space-y-1.5">
          <Label htmlFor="mailingZip" className="text-sm font-medium text-zinc-900">
           ZIP Code
          </Label>
          <Input
           id="mailingZip"
           placeholder="62701"
           inputMode="numeric"
           maxLength={5}
           className="h-11 border-zinc-200 bg-white text-[15px] placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700"
           {...register("addressInfo.mailingAddress.zip", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
             e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5);
            },
           })}
          />
          {getError("addressInfo.mailingAddress.zip") && (
           <p className="text-[13px] text-red-500" role="alert">
            {getError("addressInfo.mailingAddress.zip")}
           </p>
          )}
         </div>
        </div>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>
  </div>
 );
}
