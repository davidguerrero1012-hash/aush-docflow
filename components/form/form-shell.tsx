"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { intakeFormSchema } from "@/lib/schemas";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { StepIndicator } from "./step-indicator";
import { StepNavigation } from "./step-navigation";
import { PersonalInfo } from "./personal-info";
import { AddressInfo } from "./address-info";
import { EmploymentInfo } from "./employment-info";
import { DocumentUpload } from "./document-upload";
import { AdditionalInfo } from "./additional-info";
import { ReviewSubmit } from "./review-submit";
import type { IntakeFormData } from "@/types";

const TOTAL_STEPS = 6;

const STEP_FIELD_GROUPS: Record<number, string[]> = {
  0: [
    "personalInfo.firstName",
    "personalInfo.lastName",
    "personalInfo.dateOfBirth",
    "personalInfo.ssnLast4",
    "personalInfo.phone",
    "personalInfo.email",
  ],
  1: [
    "addressInfo.streetAddress",
    "addressInfo.city",
    "addressInfo.state",
    "addressInfo.zipCode",
    "addressInfo.mailingSameAsResidential",
    "addressInfo.mailingAddress",
    "addressInfo.mailingAddress.street",
    "addressInfo.mailingAddress.city",
    "addressInfo.mailingAddress.state",
    "addressInfo.mailingAddress.zip",
  ],
  2: [
    "employmentInfo.employerName",
    "employmentInfo.occupation",
    "employmentInfo.annualIncome",
    "employmentInfo.employmentStatus",
  ],
  3: [
    "documentUpload.documentType",
    "documentUpload.documentPath",
  ],
  4: [
    "additionalInfo.insuranceProvider",
    "additionalInfo.policyNumber",
    "additionalInfo.dependentsCount",
    "additionalInfo.additionalNotes",
  ],
  5: [], // review step
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

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

export function FormShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStep = useMemo(() => {
    const stepParam = searchParams.get("step");
    const parsed = stepParam ? parseInt(stepParam, 10) : 0;
    return parsed >= 0 && parsed < TOTAL_STEPS ? parsed : 0;
  }, [searchParams]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IntakeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(intakeFormSchema) as any,
    defaultValues: DEFAULT_VALUES,
    shouldUnregister: false,
    mode: "onTouched",
  });

  const { clearPersistedData, getPersistedStep } = useFormPersistence(
    form,
    currentStep
  );

  // Restore step from persistence on mount
  useEffect(() => {
    const persistedStep = getPersistedStep();
    if (persistedStep !== null && persistedStep !== initialStep) {
      setCurrentStep(persistedStep);
      window.history.replaceState(null, "", `/form?step=${persistedStep}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update URL when step changes
  useEffect(() => {
    const url = `/form?step=${currentStep}`;
    window.history.replaceState(null, "", url);
  }, [currentStep]);

  // Warn on navigation with unsaved data
  useEffect(() => {
    const hasData = form.formState.isDirty;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasData && !isSubmitting) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty, isSubmitting]);

  const goToStep = useCallback(
    (step: number) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const handleNext = useCallback(async () => {
    // Validate current step fields
    const fields = STEP_FIELD_GROUPS[currentStep];
    if (fields && fields.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valid = await form.trigger(fields as any);
      if (!valid) return;
    }

    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, form, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleSubmit = useCallback(async () => {
    // Validate all fields
    const valid = await form.trigger();
    if (!valid) {
      // Find first step with error and go there
      for (let step = 0; step < TOTAL_STEPS; step++) {
        const fields = STEP_FIELD_GROUPS[step];
        if (fields) {
          for (const field of fields) {
            const parts = field.split(".");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let err: any = form.formState.errors;
            for (const part of parts) {
              err = err?.[part];
            }
            if (err) {
              goToStep(step);
              return;
            }
          }
        }
      }
      return;
    }

    // Check honeypot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formValues = form.getValues() as any;
    if (formValues.honeypot) {
      // Bot detected — silently pretend success
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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Submission failed");
      }

      const result = await res.json();
      clearPersistedData();
      router.push(`/success?ref=${result.referenceNumber}`);
    } catch (err) {
      // Show error on review step
      form.setError("root" as never, {
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router, clearPersistedData, goToStep]);

  const handleEditStep = useCallback(
    (step: number) => {
      goToStep(step);
    },
    [goToStep]
  );

  const StepComponent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return <PersonalInfo />;
      case 1:
        return <AddressInfo />;
      case 2:
        return <EmploymentInfo />;
      case 3:
        return <DocumentUpload />;
      case 4:
        return <AdditionalInfo />;
      case 5:
        return <ReviewSubmit onEditStep={handleEditStep} />;
      default:
        return null;
    }
  }, [currentStep, handleEditStep]);

  // Root-level error display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rootError = (form.formState.errors as any)?.root?.message as string | undefined;

  return (
    <FormProvider {...form}>
      <div className="w-full">
        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Form Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {rootError && (
            <div
              className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              {rootError}
            </div>
          )}

          <div className="relative overflow-hidden" style={{ minHeight: "320px" }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {StepComponent}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live region for screen readers */}
          <div aria-live="polite" className="sr-only">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </div>
        </div>

        {/* Navigation */}
        <StepNavigation
          currentStep={currentStep}
          onNext={handleNext}
          onBack={handleBack}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Spacer for fixed mobile navigation */}
        <div className="h-20 sm:hidden" />
      </div>
    </FormProvider>
  );
}
