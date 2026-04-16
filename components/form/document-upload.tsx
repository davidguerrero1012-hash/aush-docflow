"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, RotateCcw, Check, ChevronRight, User } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | "select-doc-type"
  | "scan-document"
  | "processing-ocr"
  | "ocr-results"
  | "scan-face"
  | "face-done"
  | "complete";

type CameraState = "inactive" | "requesting" | "active" | "captured" | "denied";

// Which camera session is active
type CameraTarget = "document" | "face";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentUpload() {
  const {
    setValue,
    formState: { errors },
    control,
  } = useFormContext<IntakeFormData>();

  // Refs
  const fileRef = useRef<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Phase management
  const [phase, setPhase] = useState<Phase>("select-doc-type");

  // Document camera state
  const [cameraState, setCameraState] = useState<CameraState>("inactive");
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>("document");
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);

  // Document state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setEditedFields] = useState<Set<string>>(new Set());
  const [extractedCount, setExtractedCount] = useState<{ filled: number; total: number } | null>(null);

  // Face state
  const [, setFaceImageUrl] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);

  // Form watchers
  const docType = useWatch({ control, name: "documentUpload.documentType" });
  const ocrData = useWatch({ control, name: "documentUpload.ocrData" });

  const ocr = useOCR();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getError(path: string): string | undefined {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = errors;
    for (const part of parts) {
      current = current?.[part];
    }
    return current?.message as string | undefined;
  }

  const isPassport = docType === "passport";

  // ---------------------------------------------------------------------------
  // Camera functions (shared between document + face)
  // ---------------------------------------------------------------------------

  const startCamera = useCallback(
    async (target: CameraTarget) => {
      setCameraTarget(target);
      setCameraState("requesting");
      try {
        const facingMode = target === "face" ? "user" : "environment";
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
    },
    []
  );

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
    startCamera(cameraTarget);
  }, [capturedImageUrl, startCamera, cameraTarget]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ---------------------------------------------------------------------------
  // Auto-fill form fields from OCR
  // ---------------------------------------------------------------------------

  const applyOcrToForm = useCallback(
    (result: OCRResult) => {
      let filled = 0;
      const total = 5; // firstName, lastName, dob, streetAddress, city/state/zip

      for (const field of result.fields) {
        if (!field.value || field.value.trim() === "") continue;

        switch (field.fieldName) {
          case "name": {
            const parts = field.value.trim().split(/\s+/);
            const firstName = parts[0] || "";
            const lastName = parts.slice(1).join(" ") || "";
            if (firstName) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue("personalInfo.firstName" as any, firstName, { shouldValidate: false });
              filled++;
            }
            if (lastName) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue("personalInfo.lastName" as any, lastName, { shouldValidate: false });
              filled++;
            }
            break;
          }
          case "dateOfBirth": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue("personalInfo.dateOfBirth" as any, field.value, { shouldValidate: false });
            filled++;
            break;
          }
          case "address": {
            // Try simple split: first line = street, rest = city/state/zip
            const lines = field.value.split(/[,\n]+/).map((l) => l.trim());
            if (lines[0]) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue("addressInfo.streetAddress" as any, lines[0], { shouldValidate: false });
              filled++;
            }
            if (lines[1]) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue("addressInfo.city" as any, lines[1], { shouldValidate: false });
            }
            if (lines[2]) {
              // Could be "STATE ZIP"
              const stateZip = lines[2].trim().split(/\s+/);
              if (stateZip[0]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue("addressInfo.state" as any, stateZip[0], { shouldValidate: false });
              }
              if (stateZip[1]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue("addressInfo.zipCode" as any, stateZip[1], { shouldValidate: false });
              }
            }
            break;
          }
          default:
            break;
        }
      }

      setExtractedCount({ filled: Math.min(filled, total), total });
    },
    [setValue]
  );

  // ---------------------------------------------------------------------------
  // Document file processing
  // ---------------------------------------------------------------------------

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
      setPhase("processing-ocr");

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
          applyOcrToForm(result);
          setPhase("ocr-results");
        } else {
          setPhase("ocr-results");
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
        setPhase("ocr-results");
      } finally {
        setUploading(false);
      }
    },
    [docType, setValue, ocr, applyOcrToForm]
  );

  // Use captured document photo
  const useDocumentPhoto = useCallback(async () => {
    if (!canvasRef.current) return;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) return;

    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    await processFile(file);
    setCapturedImageUrl(null);
    setCameraState("inactive");
  }, [processFile]);

  // ---------------------------------------------------------------------------
  // Face photo handling
  // ---------------------------------------------------------------------------

  const useFacePhoto = useCallback(async () => {
    if (!canvasRef.current) return;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) return;

    const file = new File([blob], `face-${Date.now()}.jpg`, { type: "image/jpeg" });

    setFaceUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "face_scan");

      const res = await fetch("/api/upload-doc", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Face upload failed");
      }

      const data = await res.json();
      setFaceImageUrl(data.path);
      setCapturedImageUrl(null);
      setCameraState("inactive");
      setPhase("face-done");

      // Auto-advance to complete after brief delay
      setTimeout(() => setPhase("complete"), 1200);
    } catch {
      setUploadError("Face upload failed. Please try again.");
    } finally {
      setFaceUploading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Remove / reset
  // ---------------------------------------------------------------------------

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
    setExtractedCount(null);
    setPhase("select-doc-type");
  }, [previewUrl, setValue, ocr]);

  const handleFieldEdit = useCallback((fieldName: string) => {
    setEditedFields((prev) => new Set(prev).add(fieldName));
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isProcessing = ocr.status === "loading";
  const hasOcrResults = ocr.status === "success" && ocrData;
  const showCamera =
    cameraState === "active" || cameraState === "requesting" || cameraState === "captured";

  // ---------------------------------------------------------------------------
  // Render: Document guide overlay
  // ---------------------------------------------------------------------------

  function DocumentGuideOverlay() {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div
          className={cn(
            "border-2 border-dashed border-white/70",
            isPassport ? "w-[80%] h-[70%]" : "w-[85%] h-[55%]"
          )}
        />
        <p className="mt-3 text-xs text-white/80 text-center px-4">
          {isPassport
            ? "Position the photo page of your passport within the frame"
            : "Position the front of your ID within the frame"}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Face guide overlay
  // ---------------------------------------------------------------------------

  function FaceGuideOverlay() {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div
          className="w-[50%] h-[65%] border-2 border-dashed border-white/70"
          style={{ borderRadius: "50%" }}
        />
        <p className="mt-3 text-xs text-white/80 text-center px-4">
          Position your face within the oval
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Camera view (shared between document + face)
  // ---------------------------------------------------------------------------

  function renderCameraView(target: CameraTarget) {
    const isDocument = target === "document";

    return (
      <motion.div
        key={`camera-${target}`}
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
              {isDocument ? <DocumentGuideOverlay /> : <FaceGuideOverlay />}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="h-14 w-14 border-2 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center"
                    aria-label={isDocument ? "Capture document" : "Capture face"}
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
                alt={isDocument ? "Captured document" : "Captured face"}
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
                    onClick={isDocument ? useDocumentPhoto : useFacePhoto}
                    disabled={isDocument ? uploading : faceUploading}
                    className="bg-blue-700 hover:bg-blue-800 text-white border-0"
                  >
                    {(isDocument ? uploading : faceUploading) ? "Processing..." : "Use Photo"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setCapturedImageUrl(null);
            if (isDocument) {
              setPhase("scan-document");
            } else {
              setPhase("scan-face");
            }
          }}
          className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Phase content
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-1">
      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {/* ================================================================= */}
        {/* PHASE: Select Document Type */}
        {/* ================================================================= */}
        {phase === "select-doc-type" && (
          <motion.div
            key="select-doc-type"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                Document Verification
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Scan your identification document, then verify your face.
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center bg-blue-700 text-white text-[11px] font-medium">
                  1
                </span>
                Scan document
              </span>
              <ChevronRight className="h-3 w-3" />
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center bg-zinc-200 text-zinc-500 text-[11px] font-medium">
                  2
                </span>
                Scan face
              </span>
            </div>

            {/* Document type selector */}
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

            {/* Document guide preview + scan button */}
            {docType && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Static guide preview */}
                <div className="relative bg-zinc-900 flex items-center justify-center overflow-hidden" style={{ height: "220px" }}>
                  <div
                    className={cn(
                      "border-2 border-dashed border-white/40",
                      isPassport ? "w-[70%] h-[75%]" : "w-[80%] h-[55%]"
                    )}
                  />
                  <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/60">
                    {isPassport
                      ? "Position the photo page of your passport within the frame"
                      : "Position the front of your ID within the frame"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhase("scan-document");
                    startCamera("document");
                  }}
                  className="flex w-full items-center justify-center gap-2 bg-blue-700 text-white p-4 text-sm font-medium hover:bg-blue-800 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Scan Document
                </button>

                <p className="text-xs text-zinc-400 text-center">
                  Ensure good lighting and a flat surface for best results.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: Scan Document (camera active) */}
        {/* ================================================================= */}
        {phase === "scan-document" && (
          <motion.div
            key="scan-document"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Scan Your Document
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {isPassport
                  ? "Hold your passport photo page steady in the frame."
                  : "Hold your ID steady in the frame."}
              </p>
            </div>

            {showCamera && renderCameraView("document")}

            {/* Camera denied fallback */}
            {cameraState === "denied" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-sm text-amber-800">
                    Camera not available. Upload a photo instead.
                  </p>
                </div>
                <AceternityFileUpload
                  onChange={(files) => {
                    if (files[0]) processFile(files[0]);
                  }}
                />
              </motion.div>
            )}

            {/* If camera is inactive and not denied, show scan button again */}
            {cameraState === "inactive" && (
              <button
                type="button"
                onClick={() => startCamera("document")}
                className="flex w-full items-center justify-center gap-2 bg-blue-700 text-white p-4 text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                <Camera className="h-4 w-4" />
                Open Camera
              </button>
            )}

            {uploadError && (
              <p className="text-[13px] text-red-500" role="alert">
                {uploadError}
              </p>
            )}
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: Processing OCR */}
        {/* ================================================================= */}
        {phase === "processing-ocr" && (
          <motion.div
            key="processing-ocr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Processing Document
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Extracting information from your document...
              </p>
            </div>

            {previewUrl && (
              <div className="border border-zinc-200 overflow-hidden">
                <DocumentViewer imageUrl={previewUrl} alt="Uploaded document" />
              </div>
            )}

            <OcrErrorBoundary>
              {isProcessing && (
                <div aria-live="polite" aria-label="OCR processing status">
                  <OcrProcessor
                    progress={ocr.progress}
                    stage={ocr.stage}
                    documentPreview={previewUrl}
                  />
                </div>
              )}
            </OcrErrorBoundary>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: OCR Results */}
        {/* ================================================================= */}
        {phase === "ocr-results" && (
          <motion.div
            key="ocr-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Document Scanned
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Review extracted information below.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-zinc-400 hover:text-red-500 h-8 px-2"
                aria-label="Remove and re-scan"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Document preview thumbnail */}
            {previewUrl && (
              <div className="border border-zinc-200 overflow-hidden" style={{ maxHeight: "160px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Scanned document"
                  className="w-full object-cover"
                  style={{ maxHeight: "160px" }}
                />
              </div>
            )}

            {/* Extraction summary */}
            {extractedCount && (
              <div className="flex items-center gap-2 bg-blue-700/5 border border-blue-700/10 p-3">
                <Check className="h-4 w-4 text-blue-700 shrink-0" />
                <p className="text-sm text-blue-800">
                  Extracted {extractedCount.filled} of {extractedCount.total} fields from your document.
                </p>
              </div>
            )}

            {/* OCR error / timeout state */}
            <OcrErrorBoundary>
              {(ocr.status === "error" || ocr.status === "timeout") && (
                <div className="border border-amber-200 bg-amber-50 p-4" role="alert">
                  <p className="text-sm font-medium text-amber-800">
                    {ocr.error || "OCR processing failed."}
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    Fields can be filled in manually on the next steps.
                  </p>
                </div>
              )}

              {/* OCR field results */}
              {hasOcrResults && (
                <div className="space-y-3">
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
              )}

              {/* OCR error manual fields */}
              {(ocr.status === "error" || ocr.status === "timeout") && (
                <div className="space-y-3">
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
              )}
            </OcrErrorBoundary>

            {/* Continue to face scan */}
            <button
              type="button"
              onClick={() => setPhase("scan-face")}
              className="flex w-full items-center justify-center gap-2 bg-blue-700 text-white p-4 text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              Continue to Face Verification
              <ChevronRight className="h-4 w-4" />
            </button>

            {uploadError && (
              <p className="text-[13px] text-red-500" role="alert">
                {uploadError}
              </p>
            )}
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: Scan Face */}
        {/* ================================================================= */}
        {phase === "scan-face" && (
          <motion.div
            key="scan-face"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Face Verification
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Now let&apos;s verify your identity with a face scan.
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-white text-[11px]">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-zinc-600">Document scanned</span>
              </span>
              <ChevronRight className="h-3 w-3" />
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center bg-blue-700 text-white text-[11px] font-medium">
                  2
                </span>
                Scan face
              </span>
            </div>

            {/* Guidelines */}
            {!showCamera && cameraState !== "denied" && (
              <div className="space-y-4">
                {/* Static face guide preview */}
                <div className="relative bg-zinc-900 flex items-center justify-center overflow-hidden" style={{ height: "260px" }}>
                  <div
                    className="w-[45%] h-[70%] border-2 border-dashed border-white/40"
                    style={{ borderRadius: "50%" }}
                  />
                  <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/60">
                    Position your face within the oval
                  </p>
                </div>

                <div className="space-y-2 px-1">
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <span className="h-1 w-1 bg-zinc-400 shrink-0" />
                    Look directly at the camera
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <span className="h-1 w-1 bg-zinc-400 shrink-0" />
                    Ensure good lighting on your face
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <span className="h-1 w-1 bg-zinc-400 shrink-0" />
                    Remove glasses if possible
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startCamera("face")}
                  className="flex w-full items-center justify-center gap-2 bg-blue-700 text-white p-4 text-sm font-medium hover:bg-blue-800 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Scan Face
                </button>
              </div>
            )}

            {/* Active camera for face */}
            {showCamera && renderCameraView("face")}

            {/* Camera denied fallback for face */}
            {cameraState === "denied" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-sm text-amber-800">
                    Camera not available. Upload a selfie instead.
                  </p>
                </div>
                <AceternityFileUpload
                  onChange={async (files) => {
                    if (!files[0]) return;
                    setFaceUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", files[0]);
                      formData.append("documentType", "face_scan");

                      const res = await fetch("/api/upload-doc", {
                        method: "POST",
                        body: formData,
                      });
                      if (!res.ok) throw new Error("Upload failed");
                      const data = await res.json();
                      setFaceImageUrl(data.path);
                      setPhase("face-done");
                      setTimeout(() => setPhase("complete"), 1200);
                    } catch {
                      setUploadError("Face upload failed. Please try again.");
                    } finally {
                      setFaceUploading(false);
                    }
                  }}
                />
              </motion.div>
            )}

            {uploadError && (
              <p className="text-[13px] text-red-500" role="alert">
                {uploadError}
              </p>
            )}
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: Face Done (brief confirmation) */}
        {/* ================================================================= */}
        {phase === "face-done" && (
          <motion.div
            key="face-done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <div className="flex h-14 w-14 items-center justify-center bg-emerald-600 text-white">
              <Check className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-900">
              Face captured successfully
            </p>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PHASE: Complete */}
        {/* ================================================================= */}
        {phase === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Verification Complete
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Your document and face have been captured. Press OK to continue.
              </p>
            </div>

            {/* Summary cards */}
            <div className="space-y-3">
              {/* Document summary */}
              <div className="flex items-center gap-3 border border-zinc-200 p-3">
                <div className="flex h-9 w-9 items-center justify-center bg-emerald-600 text-white shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">Document scanned</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {DOCUMENT_TYPES.find((d) => d.value === docType)?.label || "Document"}{" "}
                    {extractedCount
                      ? `- ${extractedCount.filled} fields extracted`
                      : ""}
                  </p>
                </div>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Document thumbnail"
                    className="h-12 w-16 object-cover border border-zinc-100 shrink-0"
                  />
                )}
              </div>

              {/* Face summary */}
              <div className="flex items-center gap-3 border border-zinc-200 p-3">
                <div className="flex h-9 w-9 items-center justify-center bg-emerald-600 text-white shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">Face verified</p>
                  <p className="text-xs text-zinc-500">Selfie captured</p>
                </div>
                <User className="h-5 w-5 text-zinc-400 shrink-0" />
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center">
              Click OK below to proceed to the next step.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
