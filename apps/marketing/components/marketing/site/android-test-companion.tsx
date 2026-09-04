"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

import {
  browserSuggestions,
  createAndroidTestReport,
  deviceSuggestions,
  mobileWebTestChecks,
  mobileTestStorageKey,
  nativeTestChecks,
  osSuggestions,
  parseMobileTestProgress,
  serializeMobileTestProgress,
  suggestTestSetup,
  type AndroidTestReportInput,
  type AndroidTestStatus,
} from "@/lib/android-testing";

const statuses: Array<{ value: AndroidTestStatus; label: string }> = [
  { value: "not_tested", label: "Not yet" },
  { value: "pass", label: "Worked" },
  { value: "fail", label: "Didn't work" },
  { value: "blocked", label: "Couldn't test" },
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
    timezone: "",
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [syntheticConfirmed, setSyntheticConfirmed] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "error">("saved");

  useEffect(() => {
    const saved = parseMobileTestProgress(window.localStorage.getItem(mobileTestStorageKey) ?? "");
    if (saved) {
      setReport(saved.report);
      setSyntheticConfirmed(saved.syntheticConfirmed);
      setSavedAt(saved.savedAt);
      setStorageReady(true);
      return;
    }
    const suggestion = suggestTestSetup(navigator.userAgent);
    setReport((current) => ({
      ...current,
      platform: suggestion.platform,
      browserName: current.browserName || suggestion.browserName,
      androidVersion: current.androidVersion || suggestion.osVersion,
      testedAt: current.testedAt || suggestion.testedAt,
      timezone: current.timezone || suggestion.timezone,
    }));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();
      try {
        window.localStorage.setItem(
          mobileTestStorageKey,
          serializeMobileTestProgress({ report, syntheticConfirmed, savedAt: now }),
        );
        setSavedAt(now);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [report, storageReady, syntheticConfirmed]);

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
    try {
      await navigator.clipboard.writeText(generatedReport);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
    }
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

  const saveProgress = () => {
    const now = new Date().toISOString();
    try {
      window.localStorage.setItem(
        mobileTestStorageKey,
        serializeMobileTestProgress({ report, syntheticConfirmed, savedAt: now }),
      );
      setSavedAt(now);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const reset = () => {
    if (!window.confirm("Clear this local test report and start over?")) return;
    window.localStorage.removeItem(mobileTestStorageKey);
    setReport(freshReport());
    setSyntheticConfirmed(false);
    setSavedAt("");
  };

  const savedMessage = saveState === "error"
    ? "This browser could not save your progress."
    : savedAt
      ? `Saved on this phone at ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "Your answers will save on this phone.";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/10 bg-black/60 p-4 lg:hidden" aria-label="Test progress">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{completed} of {totalChecks} done</span><span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
            </div>
            <button type="button" onClick={saveProgress} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-black">
              <Save className="size-4" /> Save
            </button>
          </div>
          <p className={`mt-3 text-xs ${saveState === "error" ? "text-red-200" : "text-text-secondary"}`}>{savedMessage}</p>
        </section>
        <section className="rounded-3xl border border-accent/25 bg-accent/[0.06] p-5 md:p-7">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-black">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Before you begin</p>
              <h2 className="mt-2 text-xl font-bold text-white">Use made-up info only</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Use your invited test account. Make up every customer, product, address, and sale. Please do not enter anything from a real shop.
              </p>
              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={syntheticConfirmed}
                  onChange={(event) => setSyntheticConfirmed(event.target.checked)}
                  className="mt-0.5 size-5 accent-[var(--color-accent)]"
                />
                <span>I&apos;ll use made-up info and keep passwords and real customer details out of my notes and screenshots.</span>
              </label>
            </div>
          </div>
        </section>

        <section aria-labelledby="device-heading" className="rounded-3xl border border-white/10 bg-surface p-5 md:p-7">
          <div className="flex items-center gap-3">
            <Smartphone aria-hidden="true" className="size-5 text-accent" />
            <h2 id="device-heading" className="text-xl font-bold text-white">Your test setup</h2>
          </div>
          <p className="mt-2 text-sm text-text-secondary">We&apos;ll fill in what this phone can tell us. Just check it and add what&apos;s missing.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm text-text-secondary">Which app are you testing?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["android", "ios"] as const).map((platform) => (
                  <label key={platform} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-bold transition ${report.platform === platform ? "border-accent bg-accent text-black" : "border-white/15 text-text-secondary hover:border-white/30 hover:text-white"}`}>
                    <input className="sr-only" type="radio" name="platform" value={platform} checked={report.platform === platform} onChange={() => setReport((current) => ({ ...current, platform, androidVersion: "", browserName: platform === "ios" ? "Safari" : "Chrome" }))} />
                    {platform === "ios" ? "iPhone or iPad" : "Android"}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 text-sm text-text-secondary">
              Your test nickname
              <input autoComplete="nickname" className={fieldClass} value={report.testerAlias} onChange={(e) => updateField("testerAlias", e.target.value)} placeholder="Example: Lee-A1" />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Your phone or tablet
              <input autoComplete="off" className={fieldClass} list="device-options" value={report.deviceModel} onChange={(e) => updateField("deviceModel", e.target.value)} placeholder="Start typing or pick one" />
              <datalist id="device-options">
                {deviceSuggestions[report.platform].map((device) => <option key={device} value={device} />)}
              </datalist>
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Phone software
              <input autoComplete="off" className={fieldClass} list="os-options" value={report.androidVersion} onChange={(e) => updateField("androidVersion", e.target.value)} placeholder="Pick a version" />
              <datalist id="os-options">
                {osSuggestions[report.platform].map((version) => <option key={version} value={version} />)}
              </datalist>
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              DRX app version
              <input autoComplete="off" className={fieldClass} list="app-version-options" value={report.appVersion} onChange={(e) => updateField("appVersion", e.target.value)} placeholder="Pick one or type it" />
              <datalist id="app-version-options">
                {["0.7.3", "0.7.2", "0.7.1", "Not sure"].map((version) => <option key={version} value={version} />)}
              </datalist>
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              Build number
              <input autoComplete="off" className={fieldClass} inputMode="numeric" value={report.buildNumber} onChange={(e) => updateField("buildNumber", e.target.value)} placeholder={report.platform === "ios" ? "Find it in TestFlight" : "Find it in App info"} />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary">
              When did you test?
              <input className={fieldClass} type="datetime-local" value={report.testedAt} onChange={(e) => updateField("testedAt", e.target.value)} />
            </label>
            <label className="grid gap-2 text-sm text-text-secondary sm:col-span-2">
              Which browser will you use?
              <select className={fieldClass} value={report.browserName} onChange={(e) => updateField("browserName", e.target.value)}>
                <option value="">Pick a browser</option>
                {browserSuggestions[report.platform].map((browser) => <option key={browser} value={browser}>{browser}</option>)}
              </select>
            </label>
          </div>
        </section>

        {[
          {
            id: "getting-started-checks",
            eyebrow: "Start here",
            title: "Sign in and set up your first workspace",
            description: "Onboarding is the first part of the test. Take your time and tell us about any question that does not feel clear.",
            checks: nativeTestChecks.slice(0, 2),
          },
          {
            id: "native-checks",
            eyebrow: `${report.platform === "ios" ? "iPhone or iPad" : "Android"} app`,
            title: "Try the everyday work",
            description: "Work through these in the app you installed. Then we'll do a shorter check in your phone's browser.",
            checks: nativeTestChecks.slice(2),
          },
          {
            id: "web-checks",
            eyebrow: "One more quick round",
            title: "Now try DRX in your browser",
            description: "On this same phone, open deelrxcrm.app and make sure your work carries over cleanly.",
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
            <p className="text-sm text-text-secondary">{completed} of {totalChecks} done</p>
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
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-sm font-bold text-white">Here&apos;s how</p>
                        <ol className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                          {check.steps.map((step, stepIndex) => (
                            <li key={step} className="flex gap-3">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{stepIndex + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="sr-only">How did {check.title} go?</legend>
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
                    Anything to add? <span className="sr-only">for {check.title}</span>
                    <textarea className={`${fieldClass} min-h-24 resize-y`} value={result.notes} onChange={(e) => updateResult(check.id, "notes", e.target.value)} placeholder="Tell us what happened. Please leave out passwords and real customer details." />
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
            <h2 id="finish-heading" className="text-xl font-bold text-white">Wrap it up</h2>
          </div>
          <label className="mt-5 grid gap-2 text-sm text-text-secondary">
            Anything else we should know?
            <textarea className={`${fieldClass} min-h-32 resize-y`} value={report.overallNotes} onChange={(e) => updateField("overallNotes", e.target.value)} placeholder="What felt smooth? What got in your way?" />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={saveProgress} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-5 py-2 text-sm font-bold text-accent transition hover:bg-accent/15">
              <Save className="size-4" /> Save my progress
            </button>
            <button type="button" onClick={copyReport} disabled={!syntheticConfirmed} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
              {copyState === "copied" ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copyState === "copied" ? "Copied" : "Copy my report"}
            </button>
            <button type="button" onClick={downloadReport} disabled={!syntheticConfirmed} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="size-4" /> Save my report
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm text-text-secondary transition hover:text-white">
              <RotateCcw className="size-4" /> Clear and start over
            </button>
          </div>
          {!syntheticConfirmed ? <p className="mt-3 text-xs text-amber-200">Check the made-up-info box before you copy or save.</p> : null}
          {copyState === "error" ? <p className="mt-3 text-xs text-red-200">Copy did not work here. Save the report instead.</p> : null}
          <p className={`mt-3 text-xs ${saveState === "error" ? "text-red-200" : "text-text-secondary"}`}>{savedMessage}</p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-text-secondary">Your progress</span>
            <span className="text-2xl font-bold text-white">{progress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <p className="text-2xl font-bold text-white">{completed}</p>
              <p className="text-xs text-text-secondary">Done</p>
            </div>
            <div className="rounded-2xl bg-accent/[0.08] p-3">
              <p className="text-2xl font-bold text-accent">{passed}</p>
              <p className="text-xs text-text-secondary">Worked</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-text-secondary">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>{savedMessage} Come back with this browser and your answers will be waiting.</p>
          </div>
          <button type="button" onClick={saveProgress} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-black">
            <Save className="size-4" /> Save my progress
          </button>
        </div>
      </aside>

    </div>
  );
}
