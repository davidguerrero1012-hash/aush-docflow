import Link from "next/link";
import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-xl">
        <BlurFade delay={0.1} inView>
          <div className="text-center">
            <Image
              src="/aush-logo.png"
              alt="AUSH Relay"
              width={64}
              height={64}
              className="mx-auto mb-6"
              priority
            />
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-400">
              Document Intake Platform
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            AUSH DocFlow
          </h1>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <div className="mx-auto mt-8 h-px w-16 bg-zinc-300" />
        </BlurFade>

        <BlurFade delay={0.6} inView>
          <div className="mt-8">
            <TextGenerateEffect
              words="Secure document intake with intelligent verification, automated OCR extraction, and encrypted storage."
              className="text-center text-base font-normal leading-relaxed text-zinc-500"
              duration={0.3}
            />
          </div>
        </BlurFade>

        <BlurFade delay={0.9} inView>
          <div className="mt-10 text-center">
            <Link
              href="/form"
              className="inline-flex h-12 items-center justify-center border border-zinc-900 bg-zinc-900 px-10 text-sm font-medium tracking-wide text-white transition-colors duration-150 hover:bg-zinc-800"
            >
              Start Application
            </Link>
          </div>
        </BlurFade>

        <BlurFade delay={1.1} inView>
          <p className="mt-14 text-center text-xs tracking-wide text-zinc-400">
            Smart OCR&ensp;/&ensp;AES-256 Encryption&ensp;/&ensp;PDF Summary&ensp;/&ensp;Real-time Validation
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
