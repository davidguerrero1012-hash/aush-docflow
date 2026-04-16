"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, RotateCcw } from "lucide-react";
import { FileUpload as AceternityFileUpload } from "@/components/ui/file-upload";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const OCR_FIELD_MAP: Record<string, { label: string; formField: string }> = {
  name: { label: "Full Name", formField: "documentUpload.ocrData.fields.0.value" },
  dateOfBirth: { label: "Date of Birth", formField: "documentUpload.ocrData.fields.1.value" },
  address: { label: "Address", formField: "documentUpload.ocrData.fields.2.value" },
  idNumber: { label: "ID Number", formField: "documentUpload.ocrData.fields.3.value" },
  expiration: { label: "Expiration Date", formField: "documentUpload.ocrData.fields.4.value" },
};

type CameraState = "inactive" | "requesting" | "active" | "captured" | "denied";

export function DocumentUpload() {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<IntakeFormData>();

  const fileRef = useRef<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setEditedFields] = useState<Set<string>>(new Set());
  const [cameraState, setCameraState] = useState<CameraState>("inactive");
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const docType = useWatch({ control, name: "documentUpload.documentType" });
  const docPath = useWatch({ control, name: "documentUpload.documentPath" });
  const ocrData = useWatch({ control, name: "documentUpload.ocrData" });

  const ocr = useOCR();

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 640px)").matches);
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

  // Camera functions
  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("active");
    } catch {
      setCameraState("denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("inactive");
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const url = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImageUrl(url);
    setCameraState("captured");
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    if (capturedImageUrl) {
      setCapturedImageUrl(null);
    }
    startCamera();
  }, [capturedImageUrl, startCamera]);

  const usePhoto = useCallback(async () => {
    if (!canvasRef.current) return;

    // Convert canvas to File
    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) return;

    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    await processFile(file);
    setCapturedImageUrl(null);
    setCameraState("inactive");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // File processing (shared between camera capture and file upload)
  const processFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File too large. Maximum size is 10MB.");
        return;
      }

      setUploadError(null);
      fileRef.current = file;

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

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
  const showCamera = cameraState === "active" || cameraState === "requesting" || cameraState === "captured";

  return (
    <div className="space-y-1">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Document Verification
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Scan or upload your identification document.
        </p>
      </motion.div>

      {/* Document Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
                "h-11 w-full border-zinc-200 text-[15px]",
                "focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:border-blue-700",
                getError("documentUpload.documentType") ? "border-red-500" : ""
              )}
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

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Left: Camera / Upload / Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <AnimatePresence mode="wait">
            {/* Camera View */}
            {showCamera && !hasFile && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative border border-zinc-200 bg-black overflow-hidden">
                  {cameraState === "requesting" && (
                    <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
                      Requesting camera access...
                    </div>
                  )}

                  {cameraState === "active" && (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full"
                        style={{ maxHeight: "400px", objectFit: "cover" }}
                      />
                      {/* Document frame guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[85%] h-[60%] border-2 border-dashed border-white/60" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-center text-xs text-white/80 mb-3">
                          Align document within the frame
                        </p>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="h-14 w-14 border-2 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center"
                            aria-label="Capture photo"
                          >
                            <div className="h-10 w-10 bg-white" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {cameraState === "captured" && capturedImageUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={capturedImageUrl}
                        alt="Captured document"
                        className="w-full"
                        style={{ maxHeight: "400px", objectFit: "contain" }}
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div className="flex gap-3 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={retakePhoto}
                            className="bg-white/90 hover:bg-white text-zinc-900 border-0"
                          >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Retake
                          </Button>
                          <Button
                            type="button"
                            onClick={usePhoto}
                            className="bg-blue-700 hover:bg-blue-800 text-white border-0"
                          >
                            Use Photo
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Camera unavailable — show Aceternity file upload */}
            {cameraState === "denied" && !hasFile && (
              <motion.div
                key="denied"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AceternityFileUpload
                  onChange={(files) => {
                    if (files[0]) processFile(files[0]);
                  }}
                />
                {getError("documentUpload.documentPath") && (
                  <p className="mt-1.5 text-[13px] text-red-500" role="alert">
                    {getError("documentUpload.documentPath")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Default: Scan + Upload options */}
            {!showCamera && !hasFile && cameraState !== "denied" && (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Camera only — upload shows only after camera fails */}
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={uploading || ocr.status === "loading"}
                  className="flex w-full items-center justify-center gap-2 border border-zinc-200 bg-zinc-900 text-white p-4 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  Scan Document
                </button>
              </motion.div>
            )}

            {/* File Preview */}
            {hasFile && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-zinc-700 truncate max-w-[240px]">
                    {fileRef.current?.name || "Scanned document"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-zinc-400 hover:text-red-500 h-8 px-2"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {previewUrl && (
                  <DocumentViewer imageUrl={previewUrl} alt="Uploaded document" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {uploadError && (
            <p className="mt-2 text-[13px] text-red-500" role="alert">
              {uploadError}
            </p>
          )}

          {!showCamera && (
            <p className="mt-3 text-xs text-zinc-400">
              For best results, ensure good lighting and a flat surface.
            </p>
          )}
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
                  <div className="border border-amber-200 bg-amber-50 p-5 text-center" role="alert">
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
                        {(ocrData as OCRResult).fields.length} verified
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

              {!hasFile && !isProcessing && ocr.status === "idle" && !showCamera && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex h-full items-center justify-center border border-dashed border-zinc-200 bg-zinc-50/30 p-8">
                    <p className="text-sm text-zinc-400 text-center">
                      Scan or upload a document to extract fields automatically
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </OcrErrorBoundary>
        </motion.div>
      </div>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

