"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

import {
  createAndroidTestReport,
  mobileWebTestChecks,
  nativeTestChecks,
  type AndroidTestReportInput,
  type AndroidTestStatus,
} from "@/lib/android-testing";

const statuses: Array<{ value: AndroidTestStatus; label: string }> = [
  { value: "not_tested", label: "Not tested" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
];

function freshReport(): AndroidTestReportInput {
  return {
    platform: "android",
    testerAlias: "",
    deviceModel: "",
    androidVersion: "",
    appVersion: "",
    buildNumber: "",
    browserName: "",
    testedAt: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    overallNotes: "",
    results: Object.fromEntries(
      [...nativeTestChecks, ...mobileWebTestChecks].map((check) => [check.id, { status: "not_tested", notes: "" }]),
    ),
  };
}

const fieldClass =
  "min-h-11 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-accent focus:ring-2 focus:ring-accent/20";

export function MobileTestCompanion() {
  const [report, setReport] = useState<AndroidTestReportInput>(freshReport);
  const [copied, setCopied] = useState(false);
  const [syntheticConfirmed, setSyntheticConfirmed] = useState(false);

  const completed = useMemo(
    () => [...nativeTestChecks, ...mobileWebTestChecks].filter((check) => report.results[check.id].status !== "not_tested").length,
    [report.results],
  );
  const passed = useMemo(
    () => [...nativeTestChecks, ...mobileWebTestChecks].filter((check) => report.results[check.id].status === "pass").length,
    [report.results],
  );
  const totalChecks = nativeTestChecks.length + mobileWebTestChecks.length;
  const progress = Math.round((completed / totalChecks) * 100);
  const generatedReport = useMemo(() => createAndroidTestReport(report), [report]);

  const updateField = (field: keyof AndroidTestReportInput, value: string) => {
    setReport((current) => ({ ...current, [field]: value }));
  };

  const updateResult = (id: string, field: "status" | "notes", value: string) => {
    setReport((current) => ({
      ...current,
      results: {
        ...current.results,
        [id]: { ...current.results[id], [field]: value },
      },
    }));
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const downloadReport = () => {
    const blob = new Blob([generatedReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `drx-${report.platform}-mobile-test-${report.appVersion.trim() || "report"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    if (!window.confirm("Clear this local test report and start over?")) return;
    setReport(freshReport());
    setSyntheticConfirmed(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-8">
        <section className="rounded-3xl border border-accent/25 bg-accent/[0.06] p-5 md:p-7">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-black">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Before you begin</p>
              <h2 className="mt-2 text-xl font-bold text-white">Keep the test fictional</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Use an authorized test account and unmistakably synthetic customers, products, addresses,
                and transactions. Never enter real customer or business records.
              </p>
              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={syntheticConfirmed}
                  onChange={(event) => setSyntheticConfirmed(event.target.checked)}
                  className="mt-0.5 size-5 accent-[var(--color-accent)]"
                />
                <span>I will use synthetic data only and keep credentials out of notes and screenshots.</span>
              </label>
            </div>
          </div>
        </section>

        <section aria-labelledby="device-heading" className="rounded-3xl border border-white/10 bg-surface p-5 md:p-7">
          <div className="flex items-center gap-3">
            <Smartphone aria-hidden="true" className="size-5 text-accent" />
            <h2 id="device-heading" className="text-xl font-bold text-white">Your test setup</h2>
          </div>
          <p className="mt-2 text-sm text-text-secondary">Use a nickname—not your full Google account address.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm text-text-secondary">Native platform</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["android", "ios"] as const).map((platform) => (
                  <label key={platform} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-bold transition ${report.platform === platform ? "border-accent bg-accent text-black" : "border-white/15 text-text-secondary hover:border-white/30 hover:text-white"}`}>
                    <input className="sr-only" type="radio" name="platform" value={platform} checked={report.platform === platform} onChange={() => setReport((current) => ({ ...current, platform }))} />
                    {platform === "ios" ? "iOS / TestFlight" : "Android / Google Play"}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 text-sm text-text-secondary">
              Tester alias
              <input className={fieldClass} value={report.testerAlias} onChange={(e) => updateField("testerAlias", e.target.value)} placeholder="Example: Lee-A1" />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Phone model
              <input className={fieldClass} value={report.deviceModel} onChange={(e) => updateField("deviceModel", e.target.value)} placeholder="Example: Pixel 9" />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              {report.platform === "ios" ? "iOS version" : "Android version"}
              <input className={fieldClass} value={report.androidVersion} onChange={(e) => updateField("androidVersion", e.target.value)} placeholder={report.platform === "ios" ? "Example: iOS 19" : "Example: Android 16"} />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              DRX app version
              <input className={fieldClass} value={report.appVersion} onChange={(e) => updateField("appVersion", e.target.value)} placeholder="Shown in App info" />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Native build number
              <input className={fieldClass} inputMode="numeric" value={report.buildNumber} onChange={(e) => updateField("buildNumber", e.target.value)} placeholder="Shown in App info" />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Test date and time
              <input className={fieldClass} type="datetime-local" value={report.testedAt} onChange={(e) => updateField("testedAt", e.target.value)} />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary sm:col-span-2">
              Mobile browser used for the required web test
              <input className={fieldClass} value={report.browserName} onChange={(e) => updateField("browserName", e.target.value)} placeholder={report.platform === "ios" ? "Example: Safari" : "Example: Chrome"} />
            </label>
          </div>
        </section>

        {[
          {
            id: "native-checks",
            eyebrow: `${report.platform === "ios" ? "iOS" : "Android"} app`,
            title: "Run the native checks",
            description: "Test the installed release build before moving to the browser.",
            checks: nativeTestChecks,
          },
          {
            id: "web-checks",
            eyebrow: "Required second pass",
            title: "Now test mobile web",
            description: "Use this same phone to verify cross-client persistence, usability, and tenant isolation at deelrxcrm.app.",
            checks: mobileWebTestChecks,
          },
        ].map((group) => (
        <section key={group.id} aria-labelledby={`${group.id}-heading`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{group.eyebrow}</p>
              <h2 id={`${group.id}-heading`} className="mt-2 text-2xl font-bold text-white">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{group.description}</p>
            </div>
            <p className="text-sm text-text-secondary">{completed} of {totalChecks} total checked</p>
          </div>

          <div className="mt-5 space-y-4">
            {group.checks.map((check, index) => {
              const result = report.results[check.id];
              return (
                <article key={check.id} className="rounded-3xl border border-white/10 bg-surface p-5 md:p-6">
                  <div className="flex gap-4">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${result.status === "pass" ? "border-accent bg-accent text-black" : "border-white/15 text-text-secondary"}`}>
                      {result.status === "pass" ? <Check aria-label="Passed" className="size-5" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white">{check.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">{check.prompt}</p>
                    </div>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="sr-only">Outcome for {check.title}</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {statuses.map((status) => (
                        <label key={status.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-xs font-bold uppercase tracking-wide transition ${result.status === status.value ? status.value === "pass" ? "border-accent bg-accent text-black" : status.value === "fail" ? "border-red-400/70 bg-red-400/10 text-red-200" : status.value === "blocked" ? "border-amber-300/70 bg-amber-300/10 text-amber-100" : "border-white/30 bg-white/10 text-white" : "border-white/10 text-text-secondary hover:border-white/25 hover:text-white"}`}>
                          <input className="sr-only" type="radio" name={`status-${check.id}`} value={status.value} checked={result.status === status.value} onChange={() => updateResult(check.id, "status", status.value)} />
                          {status.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="mt-4 grid gap-2 text-sm text-text-secondary">
                    Notes <span className="sr-only">for {check.title}</span>
                    <textarea className={`${fieldClass} min-h-24 resize-y`} value={result.notes} onChange={(e) => updateResult(check.id, "notes", e.target.value)} placeholder="What happened? Add sanitized reproduction steps for failures or blockers." />
                  </label>
                </article>
              );
            })}
          </div>
        </section>
        ))}

        <section aria-labelledby="finish-heading" className="rounded-3xl border border-white/10 bg-surface p-5 md:p-7">
          <div className="flex items-center gap-3">
            <Sparkles aria-hidden="true" className="size-5 text-accent" />
            <h2 id="finish-heading" className="text-xl font-bold text-white">Finish and share</h2>
          </div>
          <label className="mt-5 grid gap-2 text-sm text-text-secondary">
            Overall notes
            <textarea className={`${fieldClass} min-h-32 resize-y`} value={report.overallNotes} onChange={(e) => updateField("overallNotes", e.target.value)} placeholder="Summarize the experience, rough edges, and anything the release team should know." />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={copyReport} disabled={!syntheticConfirmed} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Copied" : "Copy report"}
            </button>
            <button type="button" onClick={downloadReport} disabled={!syntheticConfirmed} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="size-4" /> Download .txt
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm text-text-secondary transition hover:text-white">
              <RotateCcw className="size-4" /> Start over
            </button>
          </div>
          {!syntheticConfirmed ? <p className="mt-3 text-xs text-amber-200">Confirm synthetic-data use before copying or downloading.</p> : null}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-text-secondary">Progress</span>
            <span className="text-2xl font-bold text-white">{progress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <p className="text-2xl font-bold text-white">{completed}</p>
              <p className="text-xs text-text-secondary">Checked</p>
            </div>
            <div className="rounded-2xl bg-accent/[0.08] p-3">
              <p className="text-2xl font-bold text-accent">{passed}</p>
              <p className="text-xs text-text-secondary">Passed</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-text-secondary">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>Your entries stay in this browser. Native and required mobile-web results are combined into one report.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
