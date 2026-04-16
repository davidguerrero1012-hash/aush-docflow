"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { intakeFormSchema } from "@/lib/schemas";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { StepIndicator } from "./step-indicator";
import { StepNavigation } from "./step-navigation";
import { QuestionScreen } from "./question-screen";
import { DocumentUpload } from "./document-upload";
import { ReviewSubmit } from "./review-submit";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/lib/schemas";
import type { IntakeFormData } from "@/types";

// NEW FLOW: Scan first, then fill what OCR missed
// Q0: Scan your ID (camera/upload + OCR)
// Q1: Verify/edit name (auto-filled from OCR)
// Q2: Verify/edit DOB (auto-filled from OCR)
// Q3: SSN last 4 (can't get from OCR)
// Q4: Phone + Email (can't get from OCR)
// Q5: Verify/edit address (auto-filled from OCR)
// Q6: Mailing address same?
// Q7: Employment info
// Q8: Annual income
// Q9: Insurance (optional)
// Q10: Additional notes (optional)
// Q11: Review & submit

const TOTAL_QUESTIONS = 12;

const QUESTION_FIELDS: Record<number, string[]> = {
  0: ["documentUpload.documentType", "documentUpload.documentPath"],
  1: ["personalInfo.firstName", "personalInfo.lastName"],
  2: ["personalInfo.dateOfBirth"],
  3: ["personalInfo.ssnLast4"],
  4: ["personalInfo.phone", "personalInfo.email"],
  5: ["addressInfo.streetAddress", "addressInfo.city", "addressInfo.state", "addressInfo.zipCode"],
  6: ["addressInfo.mailingSameAsResidential"],
  7: ["employmentInfo.employerName", "employmentInfo.occupation", "employmentInfo.employmentStatus"],
  8: ["employmentInfo.annualIncome"],
  9: [],  // optional
  10: [], // optional
  11: [], // review
};

const OPTIONAL_QUESTIONS = new Set([9, 10]);

const slideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const INPUT_CLASS = "h-14 text-lg bg-transparent border-0 border-b-2 border-zinc-200 focus:border-blue-700 focus:ring-0 outline-none rounded-none px-0 w-full transition-colors";
const SELECT_CLASS = "h-14 text-lg border-0 border-b-2 border-zinc-200 focus:border-blue-700 focus:ring-0 outline-none rounded-none bg-transparent";

const DEFAULT_VALUES: IntakeFormData = {
  personalInfo: {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    ssnLast4: "",
    phone: "",
    email: "",
  },
  addressInfo: {
    streetAddress: "",
    city: "",
    state: "" as IntakeFormData["addressInfo"]["state"],
    zipCode: "",
    mailingSameAsResidential: true,
    mailingAddress: undefined,
  },
  employmentInfo: {
    employerName: "",
    occupation: "",
    annualIncome: 0,
    employmentStatus: "" as unknown as IntakeFormData["employmentInfo"]["employmentStatus"],
  },
  documentUpload: {
    documentType: "" as unknown as IntakeFormData["documentUpload"]["documentType"],
    documentPath: null,
    ocrData: null,
  },
  additionalInfo: {
    insuranceProvider: "",
    policyNumber: "",
    dependentsCount: 0,
    additionalNotes: "",
  },
};

// Q1: Name (auto-filled from OCR, user verifies)
function Q1_Name() {
  const { register, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">First Name</Label>
        <input {...register("personalInfo.firstName")} className={INPUT_CLASS} placeholder="Jane" autoFocus />
        {e?.personalInfo?.firstName && <p className="text-sm text-red-500">{e.personalInfo.firstName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Last Name</Label>
        <input {...register("personalInfo.lastName")} className={INPUT_CLASS} placeholder="Smith" />
        {e?.personalInfo?.lastName && <p className="text-sm text-red-500">{e.personalInfo.lastName.message}</p>}
      </div>
    </div>
  );
}

function Q2_DOB() {
  const { register, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-2">
      <input type="date" {...register("personalInfo.dateOfBirth")} className={INPUT_CLASS} autoFocus />
      {e?.personalInfo?.dateOfBirth && <p className="text-sm text-red-500">{e.personalInfo.dateOfBirth.message}</p>}
    </div>
  );
}

function Q3_SSN() {
  const { register, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-2">
      <input
        {...register("personalInfo.ssnLast4")}
        type="password"
        inputMode="numeric"
        maxLength={4}
        className={INPUT_CLASS}
        placeholder="0000"
        autoFocus
      />
      <p className="text-xs text-zinc-400">Encrypted with AES-256-GCM before storage.</p>
      {e?.personalInfo?.ssnLast4 && <p className="text-sm text-red-500">{e.personalInfo.ssnLast4.message}</p>}
    </div>
  );
}

function Q4_Contact() {
  const { register, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Phone</Label>
        <input {...register("personalInfo.phone")} type="tel" className={INPUT_CLASS} placeholder="(555) 123-4567" autoFocus />
        {e?.personalInfo?.phone && <p className="text-sm text-red-500">{e.personalInfo.phone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Email</Label>
        <input {...register("personalInfo.email")} type="email" className={INPUT_CLASS} placeholder="jane@example.com" />
        {e?.personalInfo?.email && <p className="text-sm text-red-500">{e.personalInfo.email.message}</p>}
      </div>
    </div>
  );
}

function Q5_Address() {
  const { register, setValue, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Street Address</Label>
        <input {...register("addressInfo.streetAddress")} className={INPUT_CLASS} placeholder="123 Main Street" autoFocus />
        {e?.addressInfo?.streetAddress && <p className="text-sm text-red-500">{e.addressInfo.streetAddress.message}</p>}
      </div>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3 space-y-2">
          <Label className="text-sm text-zinc-500">City</Label>
          <input {...register("addressInfo.city")} className={INPUT_CLASS} placeholder="New York" />
          {e?.addressInfo?.city && <p className="text-sm text-red-500">{e.addressInfo.city.message}</p>}
        </div>
        <div className="col-span-1 space-y-2">
          <Label className="text-sm text-zinc-500">State</Label>
          <Select onValueChange={(v) => setValue("addressInfo.state" as never, v as never, { shouldValidate: true })}>
            <SelectTrigger className={SELECT_CLASS}><SelectValue placeholder="--" /></SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {e?.addressInfo?.state && <p className="text-sm text-red-500">{e.addressInfo.state.message}</p>}
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-sm text-zinc-500">ZIP</Label>
          <input {...register("addressInfo.zipCode")} inputMode="numeric" maxLength={5} className={INPUT_CLASS} placeholder="10001" />
          {e?.addressInfo?.zipCode && <p className="text-sm text-red-500">{e.addressInfo.zipCode.message}</p>}
        </div>
      </div>
    </div>
  );
}

function Q6_Mailing() {
  const { setValue, watch, register, formState: { errors } } = useFormContext<IntakeFormData>();
  const isSame = watch("addressInfo.mailingSameAsResidential");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setValue("addressInfo.mailingSameAsResidential", true)}
          className={`h-14 flex-1 border text-lg font-medium transition-colors ${isSame ? "border-blue-700 bg-blue-50 text-blue-900" : "border-zinc-300 text-zinc-600 hover:border-zinc-400"}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setValue("addressInfo.mailingSameAsResidential", false)}
          className={`h-14 flex-1 border text-lg font-medium transition-colors ${!isSame ? "border-blue-700 bg-blue-50 text-blue-900" : "border-zinc-300 text-zinc-600 hover:border-zinc-400"}`}
        >
          No
        </button>
      </div>
      {!isSame && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-zinc-500">Mailing Street</Label>
            <input {...register("addressInfo.mailingAddress.street")} className={INPUT_CLASS} autoFocus />
            {e?.addressInfo?.mailingAddress?.street && <p className="text-sm text-red-500">{e.addressInfo.mailingAddress.street.message}</p>}
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-2">
              <Label className="text-sm text-zinc-500">City</Label>
              <input {...register("addressInfo.mailingAddress.city")} className={INPUT_CLASS} />
            </div>
            <div className="col-span-1 space-y-2">
              <Label className="text-sm text-zinc-500">State</Label>
              <Select onValueChange={(v) => setValue("addressInfo.mailingAddress.state" as never, v as never)}>
                <SelectTrigger className={SELECT_CLASS}><SelectValue placeholder="--" /></SelectTrigger>
                <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-sm text-zinc-500">ZIP</Label>
              <input {...register("addressInfo.mailingAddress.zip")} inputMode="numeric" maxLength={5} className={INPUT_CLASS} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Q7_Employment() {
  const { register, setValue, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Employer</Label>
        <input {...register("employmentInfo.employerName")} className={INPUT_CLASS} placeholder="Acme Corp" autoFocus />
        {e?.employmentInfo?.employerName && <p className="text-sm text-red-500">{e.employmentInfo.employerName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Occupation</Label>
        <input {...register("employmentInfo.occupation")} className={INPUT_CLASS} placeholder="Software Engineer" />
        {e?.employmentInfo?.occupation && <p className="text-sm text-red-500">{e.employmentInfo.occupation.message}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Status</Label>
        <Select onValueChange={(v) => setValue("employmentInfo.employmentStatus" as never, v as never, { shouldValidate: true })}>
          <SelectTrigger className={SELECT_CLASS}><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="employed">Employed</SelectItem>
            <SelectItem value="self-employed">Self-Employed</SelectItem>
            <SelectItem value="unemployed">Unemployed</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        {e?.employmentInfo?.employmentStatus && <p className="text-sm text-red-500">{e.employmentInfo.employmentStatus.message}</p>}
      </div>
    </div>
  );
}

function Q8_Income() {
  const { register, formState: { errors } } = useFormContext<IntakeFormData>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;
  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg text-zinc-400">$</span>
        <input
          {...register("employmentInfo.annualIncome", { valueAsNumber: true })}
          type="number"
          inputMode="decimal"
          min={0}
          className={`${INPUT_CLASS} pl-6`}
          placeholder="75,000"
          autoFocus
        />
      </div>
      {e?.employmentInfo?.annualIncome && <p className="text-sm text-red-500">{e.employmentInfo.annualIncome.message}</p>}
    </div>
  );
}

function Q9_Insurance() {
  const { register } = useFormContext<IntakeFormData>();
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Insurance Provider</Label>
        <input {...register("additionalInfo.insuranceProvider")} className={INPUT_CLASS} placeholder="Blue Cross" autoFocus />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Policy Number</Label>
        <input {...register("additionalInfo.policyNumber")} className={INPUT_CLASS} placeholder="POL-12345" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-zinc-500">Number of Dependents</Label>
        <input {...register("additionalInfo.dependentsCount", { valueAsNumber: true })} type="number" min={0} className={INPUT_CLASS} placeholder="0" />
      </div>
    </div>
  );
}

function Q10_Notes() {
  const { register } = useFormContext<IntakeFormData>();
  return (
    <div className="space-y-2">
      <textarea
        {...register("additionalInfo.additionalNotes")}
        className="min-h-[160px] w-full bg-transparent text-lg border-0 border-b-2 border-zinc-200 focus:border-blue-700 focus:ring-0 outline-none rounded-none px-0 resize-y transition-colors"
        placeholder="Type here..."
        maxLength={2000}
        autoFocus
      />
      <p className="text-xs text-zinc-400 text-right">Max 2000 characters</p>
    </div>
  );
}

// Question definitions — scan first, then verify/fill
const QUESTIONS = [
  { text: "Scan your identification", subtitle: "We'll extract your information automatically" },
  { text: "Verify your name", subtitle: "Confirm what we extracted from your document" },
  { text: "Verify your date of birth", subtitle: "Confirm or correct" },
  { text: "Last 4 digits of your SSN", subtitle: "Required for identity verification" },
  { text: "How can we reach you?", subtitle: undefined },
  { text: "Verify your address", subtitle: "Confirm what we extracted from your document" },
  { text: "Is your mailing address the same?", subtitle: "As your home address above" },
  { text: "Tell us about your work", subtitle: undefined },
  { text: "What's your annual income?", subtitle: undefined },
  { text: "Insurance details", subtitle: "You can skip this if not applicable" },
  { text: "Anything else we should know?", subtitle: "Optional notes or comments" },
  { text: "Review your information", subtitle: "Make sure everything looks correct" },
];

export function FormShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = useMemo(() => {
    const p = searchParams.get("q");
    const n = p ? parseInt(p, 10) : 0;
    return n >= 0 && n < TOTAL_QUESTIONS ? n : 0;
  }, [searchParams]);

  const [currentQ, setCurrentQ] = useState(initialQ);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const form = useForm<IntakeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(intakeFormSchema) as any,
    defaultValues: DEFAULT_VALUES,
    shouldUnregister: false,
    mode: "onTouched",
  });

  const { clearPersistedData, getPersistedStep } = useFormPersistence(form, currentQ);

  useEffect(() => {
    const ps = getPersistedStep();
    if (ps !== null && ps !== initialQ) {
      setCurrentQ(ps);
      window.history.replaceState(null, "", `/form?q=${ps}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `/form?q=${currentQ}`);
  }, [currentQ]);

  useEffect(() => {
    const hasData = form.formState.isDirty;
    const handler = (e: BeforeUnloadEvent) => {
      if (hasData && !isSubmitting) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.formState.isDirty, isSubmitting]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ]);

  const goTo = useCallback((q: number) => {
    setDirection(q > currentQ ? 1 : -1);
    setCurrentQ(q);
  }, [currentQ]);

  const handleNext = useCallback(async () => {
    const fields = QUESTION_FIELDS[currentQ];
    if (fields && fields.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valid = await form.trigger(fields as any);
      if (!valid) return;
    }
    if (currentQ < TOTAL_QUESTIONS - 1) goTo(currentQ + 1);
  }, [currentQ, form, goTo]);

  const handleBack = useCallback(() => {
    if (currentQ > 0) goTo(currentQ - 1);
  }, [currentQ, goTo]);

  const handleSkip = useCallback(() => {
    if (currentQ < TOTAL_QUESTIONS - 1) goTo(currentQ + 1);
  }, [currentQ, goTo]);

  const handleSubmit = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vals = form.getValues() as any;
    if (vals.honeypot) {
      router.push("/success?ref=AUSH-BOT-DETECTED");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed");
      }
      const result = await res.json();
      clearPersistedData();
      router.push(`/success?ref=${result.referenceNumber}`);
    } catch (err) {
      form.setError("root" as never, {
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router, clearPersistedData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rootError = (form.formState.errors as any)?.root?.message as string | undefined;

  const questionContent = useMemo(() => {
    switch (currentQ) {
      case 0: return <DocumentUpload />;
      case 1: return <Q1_Name />;
      case 2: return <Q2_DOB />;
      case 3: return <Q3_SSN />;
      case 4: return <Q4_Contact />;
      case 5: return <Q5_Address />;
      case 6: return <Q6_Mailing />;
      case 7: return <Q7_Employment />;
      case 8: return <Q8_Income />;
      case 9: return <Q9_Insurance />;
      case 10: return <Q10_Notes />;
      case 11: return <ReviewSubmit onEditStep={goTo} />;
      default: return null;
    }
  }, [currentQ, goTo]);

  const q = QUESTIONS[currentQ];
  const isReview = currentQ === 11;
  const isDocUpload = currentQ === 0;

  return (
    <FormProvider {...form}>
      <div ref={containerRef} className="relative">
        <StepIndicator currentStep={currentQ} totalSteps={TOTAL_QUESTIONS} />

        {rootError && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {rootError}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQ}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {isReview || isDocUpload ? (
              <div className="flex min-h-screen flex-col items-center justify-start px-4 pt-16">
                <div className="w-full max-w-xl">
                  <p className="mb-2 text-sm text-zinc-400">{currentQ + 1} {"->"}</p>
                  <h2 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">{q.text}</h2>
                  {q.subtitle && <p className="mt-2 text-base text-zinc-500">{q.subtitle}</p>}
                  <div className="mt-8">{questionContent}</div>
                  <StepNavigation
                    currentStep={currentQ}
                    totalSteps={TOTAL_QUESTIONS}
                    onNext={handleNext}
                    onBack={handleBack}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            ) : (
              <QuestionScreen
                questionNumber={currentQ + 1}
                questionText={q.text}
                subtitle={q.subtitle}
                isOptional={OPTIONAL_QUESTIONS.has(currentQ)}
              >
                {questionContent}
                <StepNavigation
                  currentStep={currentQ}
                  totalSteps={TOTAL_QUESTIONS}
                  onNext={handleNext}
                  onBack={handleBack}
                  onSubmit={handleSubmit}
                  onSkip={OPTIONAL_QUESTIONS.has(currentQ) ? handleSkip : undefined}
                  isSubmitting={isSubmitting}
                  isOptional={OPTIONAL_QUESTIONS.has(currentQ)}
                />
              </QuestionScreen>
            )}
          </motion.div>
        </AnimatePresence>

        <div aria-live="polite" className="sr-only">
          Question {currentQ + 1} of {TOTAL_QUESTIONS}
        </div>
      </div>
    </FormProvider>
  );
}
