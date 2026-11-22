import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { clinicConfig } from "@/config/clinic";

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-4"}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-white ${compact ? "h-[45px] w-[96px] px-2 shadow-xs" : "h-[62px] w-[128px] px-3 shadow-sm"}`}>
        <Image
          src={clinicConfig.branding.logoUrl}
          alt={clinicConfig.name}
          width={300}
          height={190}
          priority
          className="h-auto w-full object-contain"
        />
      </span>
      <span aria-hidden="true" className={`w-px ${compact ? "h-8 bg-slate-200" : "h-10 bg-white/20"}`} />
      <span className={`flex shrink-0 items-center justify-center rounded-xl ${compact ? "h-[45px] w-[45px] bg-[#e9f5ef]" : "h-[62px] w-[62px] bg-white/10 ring-1 ring-white/15"}`}>
        <Image
          src={clinicConfig.branding.svasthLogoUrl}
          alt=""
          aria-hidden="true"
          width={48}
          height={60}
          className={compact ? "h-9 w-8 object-contain" : "h-[54px] w-[44px] object-contain"}
        />
      </span>
      <span className={`whitespace-nowrap font-bold tracking-tight ${compact ? "text-[12px] text-[#153d36]" : "text-sm text-white"}`}>
        Svaasth <span className={compact ? "text-[#078775]" : "text-[#71dabe]"}>HMS</span>
      </span>
    </div>
  );
}

export default function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#e9efeb] p-0 text-slate-800 lg:flex lg:h-dvh lg:min-h-0 lg:items-center lg:justify-center lg:overflow-hidden lg:p-5 xl:p-7">
      <div className="relative min-h-screen w-full overflow-hidden bg-[#f9faf6] lg:grid lg:h-full lg:min-h-0 lg:max-w-[1680px] lg:grid-cols-[1.08fr_0.92fr] lg:rounded-[30px] lg:shadow-[0_34px_110px_-48px_rgba(5,42,35,0.42)]">
        {/* Left Hero Panel */}
        <section className="relative hidden min-h-screen overflow-hidden bg-[#072d2c] px-12 py-10 text-white lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:justify-between lg:rounded-l-[30px] lg:py-7 xl:px-[8.5%]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_8%,rgba(42,150,117,0.24),transparent_40%),linear-gradient(145deg,#082f2e_0%,#0a3934_50%,#06292a_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
              maskImage: "linear-gradient(135deg, black, transparent 70%)",
            }}
          />
          <div className="absolute -right-48 top-[21%] h-[650px] w-[650px] rounded-full border border-white/[0.07]" />
          <div className="absolute -right-24 top-[28%] h-[500px] w-[500px] rounded-full border border-white/[0.055]" />
          <div className="absolute -bottom-56 left-[8%] h-[570px] w-[570px] rounded-full bg-[radial-gradient(circle,rgba(32,162,126,0.16),transparent_68%)]" />
          <Image
            src={clinicConfig.branding.svasthLogoUrl}
            alt=""
            aria-hidden="true"
            width={540}
            height={660}
            className="pointer-events-none absolute -bottom-20 right-[-54px] w-[min(35vw,460px)] opacity-[0.06]"
          />

          <div className="relative z-10">
            <BrandLockup />
          </div>

          <div className="relative z-10 max-w-[570px] py-4 xl:py-8">
            <div className="mb-6 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#89ddc4]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#83dfc0] shadow-[0_0_12px_rgba(131,223,192,.8)]" />
              Private clinic workspace
            </div>
            <h1 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.04em] xl:text-[54px]">
              {clinicConfig.name}
              <span className="text-[#72dabb]">.</span>
            </h1>
            <p className="mt-4 max-w-[420px] text-[14px] leading-6 text-white/65">
              The patients, care, and daily work of your clinic — connected through{" "}
              <span className="font-semibold text-white/90">Svaasth HMS</span>.
            </p>

            <div className="relative mt-7 flex h-[164px] max-w-[430px] items-center gap-5 overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#0b3934] px-6">
              <div className="absolute -right-14 -top-24 h-[300px] w-[300px] rounded-full border border-white/[0.07]" />
              <div className="absolute -right-1 -top-14 h-[210px] w-[210px] rounded-full border border-white/[0.07]" />
              <span className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] shadow-[0_16px_60px_-22px_rgba(0,0,0,.55)]">
                <span className="absolute inset-[8px] rounded-full border border-[#8de0c3]/20" />
                <Image
                  src={clinicConfig.branding.svasthLogoUrl}
                  alt=""
                  aria-hidden="true"
                  width={92}
                  height={112}
                  className="relative h-[72px] w-[58px] object-contain drop-shadow-[0_8px_18px_rgba(30,191,151,.28)]"
                />
              </span>
              <div className="relative min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8adcc2]">Designed around care</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-white">Svaasth HMS</p>
                <p className="mt-1 max-w-[190px] text-xs leading-5 text-white/55">
                  A considered workspace for {clinicConfig.name}.
                </p>
              </div>
              <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-white/35" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[11px] text-white/45">
            <span>© {new Date().getFullYear()} {clinicConfig.legalName}</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#71dabe]" /> Authorized staff access
            </span>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#fbfcf9] px-5 py-9 sm:px-10 lg:h-full lg:min-h-0 lg:rounded-r-[30px] lg:px-12 lg:py-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-44 -top-48 h-[580px] w-[580px] rounded-full bg-[radial-gradient(circle,rgba(189,226,207,0.34),transparent_68%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-60 -left-48 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(207,231,219,0.22),transparent_68%)]"
          />
          <div className="relative z-10 w-full max-w-[440px]">
            <div className="mb-10 lg:hidden">
              <BrandLockup compact />
            </div>
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-[#12816f]">
                <span className="h-px w-6 bg-[#12816f]/55" /> Staff sign-in <span className="text-slate-300">·</span> {clinicConfig.name}
              </div>
              <h2 className="text-[34px] font-semibold tracking-[-0.045em] text-[#142a25] sm:text-[38px]">{title}</h2>
              <p className="mt-2.5 text-sm leading-6 text-[#74827b]">{description}</p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[#e4eae4] bg-white shadow-[0_24px_70px_-42px_rgba(8,47,46,0.24)]">
              <div className="h-[3px] bg-gradient-to-r from-[#0c826f] via-[#36b493] to-[#a0ddbf]" />
              <div className="p-6 sm:p-8">{children}</div>
            </div>
            {footer && <div className="mt-5 text-center text-xs text-[#829088]">{footer}</div>}
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#829088]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#13836e]" /> Secure access for authorized clinic staff
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
