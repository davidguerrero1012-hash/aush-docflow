"use client";

import { useFormContext } from "react-hook-form";

export function HoneypotField() {
  const { register } = useFormContext();

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        height: 0,
        width: 0,
        overflow: "hidden",
      }}
    >
      <label htmlFor="website_url">Website</label>
      <input
        id="website_url"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register("honeypot" as never)}
      />
    </div>
  );
}
