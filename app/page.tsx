import Link from "next/link";
import { ArrowRight, Shield, FileText, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-lg text-center">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/25">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-900">
            AUSH DocFlow
          </h1>
          <p className="mt-2 text-base text-zinc-500">
            Secure document intake with intelligent verification
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/form"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-600 active:scale-[0.98]"
        >
          Start Your Application
          <ArrowRight className="h-5 w-5" />
        </Link>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Smart OCR",
              desc: "Auto-extract data from your documents",
            },
            {
              icon: Shield,
              title: "Secure",
              desc: "AES-256 encryption for sensitive data",
            },
            {
              icon: FileText,
              title: "PDF Summary",
              desc: "Get a complete summary of your submission",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <feature.icon className="mx-auto mb-2 h-6 w-6 text-indigo-500" />
              <h3 className="text-sm font-semibold text-zinc-900">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
