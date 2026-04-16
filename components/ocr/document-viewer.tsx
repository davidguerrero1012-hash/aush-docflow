"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerProps {
 imageUrl: string;
 alt: string;
}

export function DocumentViewer({ imageUrl, alt }: DocumentViewerProps) {
 const [scale, setScale] = useState(1);
 const [rotation, setRotation] = useState(0);
 const containerRef = useRef<HTMLDivElement>(null);

 const MIN_SCALE = 0.5;
 const MAX_SCALE = 3;
 const SCALE_STEP = 0.25;

 const zoomIn = useCallback(() => {
  setScale((s) => Math.min(s + SCALE_STEP, MAX_SCALE));
 }, []);

 const zoomOut = useCallback(() => {
  setScale((s) => Math.max(s - SCALE_STEP, MIN_SCALE));
 }, []);

 const rotate = useCallback(() => {
  setRotation((r) => (r + 90) % 360);
 }, []);

 // Keyboard controls
 useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleKeyDown = (e: KeyboardEvent) => {
   if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    zoomIn();
   } else if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    zoomOut();
   } else if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    rotate();
   }
  };

  container.addEventListener("keydown", handleKeyDown);
  return () => container.removeEventListener("keydown", handleKeyDown);
 }, [zoomIn, zoomOut, rotate]);

 // Pinch-to-zoom on mobile
 useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let startDistance = 0;
  let startScale = 1;

  const getDistance = (touches: TouchList) => {
   const dx = touches[0].clientX - touches[1].clientX;
   const dy = touches[0].clientY - touches[1].clientY;
   return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
   if (e.touches.length === 2) {
    startDistance = getDistance(e.touches);
    startScale = scale;
   }
  };

  const handleTouchMove = (e: TouchEvent) => {
   if (e.touches.length === 2) {
    e.preventDefault();
    const dist = getDistance(e.touches);
    const newScale = startScale * (dist / startDistance);
    setScale(Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE));
   }
  };

  container.addEventListener("touchstart", handleTouchStart, {
   passive: true,
  });
  container.addEventListener("touchmove", handleTouchMove, {
   passive: false,
  });

  return () => {
   container.removeEventListener("touchstart", handleTouchStart);
   container.removeEventListener("touchmove", handleTouchMove);
  };
 }, [scale]);

 return (
  <div className="space-y-2">
   {/* Controls */}
   <div className="flex items-center justify-center gap-1">
    <Button
     type="button"
     variant="ghost"
     size="icon-sm"
     onClick={zoomOut}
     disabled={scale <= MIN_SCALE}
     aria-label="Zoom out"
    >
     <ZoomOut className="h-4 w-4" />
    </Button>
    <span className="min-w-[3rem] text-center text-xs text-zinc-500 tabular-nums">
     {Math.round(scale * 100)}%
    </span>
    <Button
     type="button"
     variant="ghost"
     size="icon-sm"
     onClick={zoomIn}
     disabled={scale >= MAX_SCALE}
     aria-label="Zoom in"
    >
     <ZoomIn className="h-4 w-4" />
    </Button>
    <div className="mx-1 h-4 w-px bg-zinc-200" />
    <Button
     type="button"
     variant="ghost"
     size="icon-sm"
     onClick={rotate}
     aria-label="Rotate 90 degrees"
    >
     <RotateCw className="h-4 w-4" />
    </Button>
   </div>

   {/* Image container */}
   <div
    ref={containerRef}
    tabIndex={0}
    role="img"
    aria-label={`${alt} - Use +/- to zoom, R to rotate`}
    className="relative overflow-hidden border border-zinc-200 bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-700/20 focus-visible:outline-none cursor-grab active:cursor-grabbing"
    style={{ maxHeight: "400px" }}
   >
    <div className="flex items-center justify-center p-2" style={{ minHeight: "200px" }}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img
      src={imageUrl}
      alt={alt}
      className="max-w-full object-contain transition-transform duration-200"
      style={{
       transform: `scale(${scale}) rotate(${rotation}deg)`,
       transformOrigin: "center center",
      }}
      draggable={false}
     />
    </div>
   </div>

   <p className="text-center text-xs text-zinc-400">
    Use +/- keys to zoom, R to rotate
   </p>
  </div>
 );
}
