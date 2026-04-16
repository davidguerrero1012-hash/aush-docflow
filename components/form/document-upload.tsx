"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OcrProcessor } from "@/components/ocr/ocr-processor";
import { OcrErrorBoundary } from "@/components/ocr/ocr-error-boundary";
import { ConfidenceField } from "@/components/ocr/confidence-field";
import { DocumentViewer } from "@/components/ocr/document-viewer";
import { useOCR } from "@/hooks/use-ocr";
import { cn } from "@/lib/utils";
import type { IntakeFormData, OCRResult } from "@/types";

const DOCUMENT_TYPES = [
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "state_id", label: "State ID" },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const OCR_FIELD_MAP: Record<string, { label: string; formField: string }> = {
  name: { label: "Full Name", formField: "documentUpload.ocrData.fields.0.value" },
  dateOfBirth: { label: "Date of Birth", formField: "documentUpload.ocrData.fields.1.value" },
  address: { label: "Address", formField: "documentUpload.ocrData.fields.2.value" },
  idNumber: { label: "ID Number", formField: "documentUpload.ocrData.fields.3.value" },
  expiration: { label: "Expiration Date", formField: "documentUpload.ocrData.fields.4.value" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload() {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<IntakeFormData>();

  const fileRef = useRef<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setEditedFields] = useState<Set<string>>(new Set());
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const docType = useWatch({ control, name: "documentUpload.documentType" });
  const docPath = useWatch({ control, name: "documentUpload.documentPath" });
  const ocrData = useWatch({ control, name: "documentUpload.ocrData" });

  const ocr = useOCR();

  function getError(path: string): string | undefined {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = errors;
    for (const part of parts) {
      current = current?.[part];
    }
    return current?.message as string | undefined;
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File too large. Maximum size is 10MB.");
        return;
      }

      setUploadError(null);
      fileRef.current = file;

      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Upload to API
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", docType || "drivers_license");

        const res = await fetch("/api/upload-doc", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue("documentUpload.documentPath" as any, data.path, {
          shouldValidate: true,
        });

        // Trigger OCR
        const result = await ocr.processDocument(file, docType || "drivers_license");
        if (result) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setValue("documentUpload.ocrData" as any, result);
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      } finally {
        setUploading(false);
      }
    },
    [docType, setValue, ocr]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    disabled: uploading || ocr.status === "loading",
  });

  const removeFile = useCallback(() => {
    fileRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue("documentUpload.documentPath" as any, "", { shouldValidate: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue("documentUpload.ocrData" as any, null);
    ocr.reset();
    setEditedFields(new Set());
    setUploadError(null);
  }, [previewUrl, setValue, ocr]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFieldEdit = useCallback((fieldName: string) => {
    setEditedFields((prev) => new Set(prev).add(fieldName));
  }, []);

  const hasFile = !!previewUrl || !!docPath;
  const isProcessing = ocr.status === "loading";
  const hasOcrResults = ocr.status === "success" && ocrData;

  return (
    <div className="space-y-1">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Document Upload
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a photo of your identification document for verification.
        </p>
      </motion.div>

      {/* Document Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 }}
        className="mb-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="documentType" className="text-sm font-medium text-zinc-900">
            Document Type
          </Label>
          <Select
            value={docType || ""}
            onValueChange={(val) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue("documentUpload.documentType" as any, val, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger
              id="documentType"
              className={cn(
                "h-11 w-full rounded-lg border-zinc-200 text-[15px]",
                "focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500",
                getError("documentUpload.documentType") ? "border-red-500" : ""
              )}
              aria-invalid={!!getError("documentUpload.documentType")}
            >
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError("documentUpload.documentType") && (
            <p className="text-[13px] text-red-500" role="alert">
              {getError("documentUpload.documentType")}
            </p>
          )}
        </div>
      </motion.div>

      {/* Main content: Desktop side-by-side, Mobile stacked */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Left: Upload zone / Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <AnimatePresence mode="wait">
            {!hasFile ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
                    isDragActive
                      ? "border-indigo-500/50 bg-indigo-50/50"
                      : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50",
                    getError("documentUpload.documentPath") && "border-red-300 bg-red-50/30"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload
                    className={cn(
                      "mb-3 h-10 w-10",
                      isDragActive ? "text-indigo-500" : "text-zinc-400"
                    )}
                  />
                  <p className="text-sm font-medium text-zinc-700">
                    {isDragActive
                      ? "Drop your document here"
                      : "Drop your document here or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    JPG, PNG only (max 10MB)
                  </p>
                </div>
                {getError("documentUpload.documentPath") && (
                  <p className="mt-1.5 text-[13px] text-red-500" role="alert">
                    {getError("documentUpload.documentPath")}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-3"
              >
                {/* Mobile: Collapsible preview */}
                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">
                          {fileRef.current?.name || "Document"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {fileRef.current ? formatFileSize(fileRef.current.size) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="text-zinc-400 hover:text-red-500"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {mobilePreviewOpen ? (
                        <ChevronUp className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                  </button>
                  <AnimatePresence>
                    {mobilePreviewOpen && previewUrl && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3">
                          <DocumentViewer imageUrl={previewUrl} alt="Uploaded document" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Desktop: Full preview */}
                <div className="hidden sm:block">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">
                          {fileRef.current?.name || "Document"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {fileRef.current ? formatFileSize(fileRef.current.size) : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={removeFile}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {previewUrl && (
                    <DocumentViewer imageUrl={previewUrl} alt="Uploaded document" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {uploadError && (
            <p className="mt-2 text-[13px] text-red-500" role="alert">
              {uploadError}
            </p>
          )}

          {/* Tip text */}
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-indigo-50/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            <p className="text-xs text-indigo-600">
              For best results, use a well-lit, flat photo of your document.
            </p>
          </div>
        </motion.div>

        {/* Right: OCR Processing / Results */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <OcrErrorBoundary>
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div aria-live="polite" aria-label="OCR processing status">
                    <OcrProcessor
                      progress={ocr.progress}
                      stage={ocr.stage}
                      documentPreview={previewUrl}
                    />
                  </div>
                </motion.div>
              )}

              {(ocr.status === "error" || ocr.status === "timeout") && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center" role="alert">
                    <p className="text-sm font-medium text-amber-800">
                      {ocr.error || "OCR processing failed."}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Please fill in the fields below manually.
                    </p>
                  </div>
                  <div className="mt-5 space-y-4">
                    {Object.entries(OCR_FIELD_MAP).map(([key, { label, formField }]) => (
                      <ConfidenceField
                        key={key}
                        label={label}
                        confidence={0}
                        fieldName={formField}
                        onEdit={handleFieldEdit}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {hasOcrResults && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Extracted Fields
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {(ocrData as OCRResult).fields.filter((f) => f.confidence >= 95).length} of{" "}
                        {(ocrData as OCRResult).fields.length} high confidence
                      </span>
                    </div>
                    {(ocrData as OCRResult).fields.map((field, index) => {
                      const mapping = Object.values(OCR_FIELD_MAP)[index];
                      if (!mapping) return null;
                      return (
                        <ConfidenceField
                          key={field.fieldName}
                          label={mapping.label}
                          confidence={field.confidence}
                          fieldName={mapping.formField}
                          onEdit={handleFieldEdit}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!hasFile && !isProcessing && ocr.status === "idle" && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/30 p-8">
                    <div className="text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                      <p className="text-sm text-zinc-400">
                        Upload a document to see extracted fields here
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </OcrErrorBoundary>
        </motion.div>
      </div>
    </div>
  );
}
