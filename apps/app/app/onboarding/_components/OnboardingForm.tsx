"use client";

import { useActionState, useEffect, useState } from "react";
import { completeOnboarding, type OnboardingActionState } from "../_actions";
import { clearDraft, createDraft, loadDraft, nextStep, ONBOARDING_DRAFT_KEY, previousStep, productBusiness, saveDraft, validationMessage, type BusinessType, type OnboardingDraft, type OnboardingStep } from "@/lib/onboarding/state-machine";
import { capture } from "@wrelik/analytics/client";

const initialState: OnboardingActionState = { status: "idle", error: null };
const choices: Array<[BusinessType, string, string]> = [
  ["retail", "Retail store", "Sell products directly to customers from a location."],
  ["delivery", "Delivery-based", "Bring products or services to customers."], ["service", "Service business", "Sell time, appointments, or expertise."],
  ["wholesale", "Wholesale", "Sell products in bulk to other businesses."], ["hybrid", "Hybrid", "Combine products, services, or fulfillment methods."], ["other", "Other", "Start with flexible defaults."],
];
const numbered: OnboardingStep[] = ["ownerProfile", "businessName", "businessType", "location", "regionalSettings", "taxDecision", "taxDetails", "inventoryDecision", "teamDecision", "teamInvitation", "review"];

export function OnboardingCompletionRedirect({ completed, storage, navigate }: { completed: boolean; storage?: Pick<Storage, "setItem"> & { removeItem?: Storage["removeItem"] }; navigate?: (path: string) => void }) {
  useEffect(() => {
    if (!completed) return;
    const target = storage ?? window.localStorage;
    try {
      target.setItem("drx_onboarding_complete", "true");
      target.removeItem?.(ONBOARDING_DRAFT_KEY);
    } catch {
      /* Server state and the completion cookie remain authoritative. */
    } finally {
      (navigate ?? ((path) => window.location.replace(path)))("/pos/sale");
    }
  }, [completed, navigate, storage]);
  return null;
}

function Card({ selected, title, detail, onClick }: { selected: boolean; title: string; detail?: string; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-16 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent/10" : "border-white/15 bg-black/20 hover:border-white/35"}`}><strong className="block text-white">{title}</strong>{detail && <span className="mt-1 block text-sm text-text-secondary">{detail}</span>}</button>;
}

export function OnboardingForm() {
  const [result, action, pending] = useActionState(completeOnboarding, initialState);
  const [draft, setDraft] = useState(() => createDraft());
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    let timezone = "America/New_York";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch {
      timezone = "America/New_York";
    }
    let saved: OnboardingDraft;
    try {
      saved = loadDraft(window.localStorage, timezone);
    } catch {
      saved = createDraft(timezone);
    }
    setDraft(saved);
    setResumed(saved.currentStep !== "welcome");
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      if (draft.currentStep !== "completed") saveDraft(window.localStorage, draft);
    } catch {
      /* storage fallback */
    }
  }, [draft, restored]);

  useEffect(() => {
    if (!restored) return;
    document.querySelector<HTMLElement>("#onboarding-heading")?.focus();
  }, [draft.currentStep, restored]);

  const patch = (value: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...value }));
  const advance = () => {
    const message = validationMessage(draft);
    if (message) {
      capture("onboarding_validation_failed", { step: draft.currentStep, platform: "web" });
      return setError(message);
    }
    setError(null);
    capture("onboarding_step_completed", { step: draft.currentStep, platform: "web" });
    const target = nextStep(draft);
    patch({
      currentStep: target,
      returnToReview: target === "review" ? false : draft.returnToReview,
    });
  };
  const back = () => {
    setError(null);
    capture("onboarding_step_back", { step: draft.currentStep, platform: "web" });
    patch({ currentStep: draft.returnToReview ? "review" : previousStep(draft), returnToReview: false });
  };
  const edit = (step: OnboardingStep) => patch({ currentStep: step, returnToReview: true });
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      advance();
    }
  };

  const step = draft.currentStep;
  const visibleSteps = numbered
    .filter((item) => item !== "taxDetails" || draft.taxChoice === "yes")
    .filter((item) => item !== "inventoryDecision" || productBusiness(draft.businessType))
    .filter((item) => item !== "teamInvitation" || draft.inviteTeam);
  const position = Math.max(1, visibleSteps.indexOf(step) + 1);

  useEffect(() => { if (restored) capture(resumed ? "onboarding_resumed" : "onboarding_started", { platform: "web", step: draft.currentStep }); }, [restored, resumed]);
  useEffect(() => { if (result.status === "success") { clearDraft(window.localStorage); capture("onboarding_completed", { platform: "web", business_type: result.summary.businessType, inventory_enabled: result.summary.inventoryEnabled, tax_enabled: result.summary.taxEnabled }); } }, [result]);
  useEffect(() => { if (result.status === "error") capture("onboarding_submission_failed", { platform: "web", error_category: "recoverable" }); }, [result]);

  if (result.status === "success") return <WorkspaceReady summary={result.summary} />;

  return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur md:p-10" aria-labelledby="onboarding-heading">
    {step !== "welcome" && <div className="mb-8"><div className="flex justify-between text-sm text-text-secondary"><span>Business setup, step {position} of {visibleSteps.length}</span><span aria-live="polite">Your progress is saved</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={visibleSteps.length} aria-valuenow={position} aria-label={`Business setup, step ${position} of ${visibleSteps.length}`}><div className="h-full bg-accent transition-all motion-reduce:transition-none" style={{ width: `${position / visibleSteps.length * 100}%` }} /></div></div>}
    {resumed && step !== "welcome" && <p className="mb-5 rounded-lg bg-accent/10 p-3 text-sm text-white">Welcome back. Let’s finish setting up your business.</p>}
    <div
      key={step}
      className="animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none transition-all duration-300"
    >
    {step === "welcome" && <Intro title="Welcome to DRX" body="Let’s set up the essentials so you can start managing products, inventory, customers, and transactions." />}
      {step === "ownerProfile" && <Field title="What should your team call you?" body="This name appears in activity history and transaction records." label="Full name"><input autoFocus autoComplete="name" value={draft.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Field>}
      {step === "businessName" && <Field title="What should we call your business?" body="You can update the public-facing name later." label="Business name"><input autoFocus value={draft.businessName} onChange={(e) => patch({ businessName: e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Field>}
      {step === "businessType" && <Field title="What kind of business are you setting up?" body="Choose the closest fit. This only helps us recommend useful defaults."><div className="grid gap-3 md:grid-cols-2">{choices.map(([value,title,detail]) => <Card key={value} selected={draft.businessType === value} title={title} detail={detail} onClick={() => patch({ businessType: value, tracksInventory: value === "service" ? false : draft.tracksInventory })} />)}</div></Field>}
      {step === "location" && <Field title="Where does your business operate?" body="The street address is optional and stays internal unless you publish it later."><div className="grid gap-4 md:grid-cols-2"><Labeled label="Location name"><input value={draft.locationName} onChange={(e) => patch({ locationName:e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Labeled><Labeled label="City"><input value={draft.city} onChange={(e) => patch({ city:e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Labeled><Labeled label="State or region"><input value={draft.region} onChange={(e) => patch({ region:e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Labeled><Labeled label="Country"><input value={draft.country} onChange={(e) => patch({ country:e.target.value })} onKeyDown={handleInputKeyDown} className="input" /></Labeled></div></Field>}
      {step === "regionalSettings" && <Field title="Do these settings look right?" body="We suggested these from your device. You can change them now or later."><div className="grid gap-3 md:grid-cols-2"><Labeled label="Currency"><select value={draft.currency} onChange={(e) => patch({currency:e.target.value})} className="input"><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></select></Labeled><Labeled label="Time zone"><input value={draft.timezone} onChange={(e) => patch({timezone:e.target.value})} onKeyDown={handleInputKeyDown} className="input" /></Labeled></div></Field>}
      {step === "taxDecision" && <Field title="Will you collect sales tax in DRX?" body="DRX can include tax in transaction totals. Confirm the correct rules and rate for your business."><div className="grid gap-3"><Card title="Yes" selected={draft.taxChoice === "yes"} onClick={() => patch({taxChoice:"yes"})}/><Card title="Not right now" selected={draft.taxChoice === "later"} onClick={() => patch({taxChoice:"later",taxRate:""})}/><Card title="I’m not sure" detail="Leave tax off for now and revisit it in Business Settings." selected={draft.taxChoice === "unsure"} onClick={() => patch({taxChoice:"unsure",taxRate:""})}/></div></Field>}
      {step === "taxDetails" && <Field title="What default tax rate should DRX use?" body="You can configure supported product and location overrides later." label="Tax rate (%)"><input autoFocus inputMode="decimal" placeholder="8.25" value={draft.taxRate} onChange={(e) => patch({taxRate:e.target.value})} onKeyDown={handleInputKeyDown} className="input" /></Field>}
      {step === "inventoryDecision" && <Field title="Would you like DRX to track inventory quantities?" body="Inventory tracking helps prevent overselling and records stock received, sold, adjusted, and returned."><div className="grid gap-3"><Card title="Yes, track inventory" selected={draft.tracksInventory === true} onClick={() => patch({tracksInventory:true})}/><Card title="Not yet" selected={draft.tracksInventory === false} onClick={() => patch({tracksInventory:false})}/></div></Field>}
      {step === "teamDecision" && <Field title="Will anyone else use DRX with you?" body="You can assign access for managers, operators, and inventory staff."><div className="grid gap-3"><Card title="Invite someone now" selected={draft.inviteTeam === true} onClick={() => patch({inviteTeam:true})}/><Card title="I’ll do this later" selected={draft.inviteTeam === false} onClick={() => patch({inviteTeam:false})}/></div></Field>}
      {step === "teamInvitation" && <Field title="Who would you like to invite?" body="We’ll keep permissions simple. You can customize them later."><div className="grid gap-4"><Labeled label="Email"><input autoFocus type="email" value={draft.invitedUserEmail} onChange={(e) => patch({invitedUserEmail:e.target.value})} onKeyDown={handleInputKeyDown} className="input" /></Labeled><Labeled label="Role"><select value={draft.invitedUserRole} onChange={(e) => patch({invitedUserRole:e.target.value})} className="input"><option value="manager">Manager</option><option value="operator">Operator</option><option value="inventory">Inventory</option></select></Labeled></div></Field>}
      {step === "review" && <form action={action} onSubmit={() => capture("onboarding_submission_started", { platform: "web", business_type: draft.businessType, tax_enabled: draft.taxChoice === "yes", inventory_enabled: draft.tracksInventory === true })}><Intro title="Review your setup" body="Everything here can be changed later in Business Settings."/><div className="grid gap-3 md:grid-cols-2"><Summary title="Owner" value={`${draft.ownerName} · Owner`} edit={() => edit("ownerProfile")}/><Summary title="Business" value={`${draft.businessName} · ${draft.businessType}`} edit={() => edit("businessName")}/><Summary title="Location" value={`${draft.locationName}${draft.city ? ` · ${draft.city}`:""}`} edit={() => edit("location")}/><Summary title="Region" value={`${draft.currency} · ${draft.timezone}`} edit={() => edit("regionalSettings")}/><Summary title="Tax" value={draft.taxChoice === "yes" ? `Enabled at ${draft.taxRate}%` : "Not enabled"} edit={() => edit("taxDecision")}/><Summary title="Inventory" value={draft.tracksInventory ? "Tracking enabled" : "Not enabled"} edit={() => edit(productBusiness(draft.businessType) ? "inventoryDecision" : "businessType")}/></div>{Object.entries(draft).map(([name,value]) => <input key={name} type="hidden" name={name} value={typeof value === "boolean" ? String(value) : value ?? ""}/>)}<Navigation back={back} primary="Create My Workspace" pending={pending}/></form>}
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {result.status === "error" && <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4"><strong className="text-white">We couldn’t finish creating your workspace</strong><p className="mt-1 text-sm text-red-100">{result.error} Nothing was duplicated, and your progress is still here.</p></div>}
    {step !== "review" && <Navigation back={step === "welcome" ? undefined : back} primary={step === "welcome" ? "Set Up My Business" : "Continue"} onPrimary={advance}/>}
  </section>;
}

function Intro({title,body}:{title:string;body:string}) { return <><h1 id="onboarding-heading" tabIndex={-1} ref={undefined} className="text-3xl font-semibold text-white">{title}</h1><p className="mt-3 mb-7 text-text-secondary">{body}</p></>; }
function Field({title,body,label,children}:{title:string;body:string;label?:string;children:React.ReactNode}) { return <><h2 id="onboarding-heading" tabIndex={-1} className="text-3xl font-semibold text-white">{title}</h2><p className="mt-3 mb-7 text-text-secondary">{body}</p>{label ? <Labeled label={label}>{children}</Labeled>:children}</>; }
function Labeled({label,children}:{label:string;children:React.ReactNode}) { return <label className="grid gap-2 text-sm text-white"><span>{label}</span>{children}</label>; }
function Summary({title,value,edit}:{title:string;value:string;edit:()=>void}) { return <div className="rounded-xl border border-white/10 p-4"><div className="flex justify-between"><strong className="text-white">{title}</strong><button type="button" onClick={edit} className="text-sm text-accent">Edit</button></div><p className="mt-2 text-sm text-text-secondary">{value}</p></div>; }
function Navigation({back,primary,onPrimary,pending=false}:{back?:()=>void;primary:string;onPrimary?:()=>void;pending?:boolean}) { return <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6">{back ? <button type="button" onClick={back} className="min-h-11 px-4 text-white">Back</button>:<span/>}<button type={onPrimary ? "button":"submit"} onClick={onPrimary} disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-black disabled:opacity-50">{pending ? "Creating your DRX workspace…":primary}</button></div>; }

function WorkspaceReady({ summary }: { summary: import("../_actions").OnboardingSummary }) {
  const service = summary.businessType === "service";
  const actions = service
    ? [{ label: "Create Your First Service", href: "/inventory" }, { label: "Add a Customer", href: "/customers" }]
    : [{ label: "Add Your First Product", href: "/inventory" }, { label: "Receive Inventory", href: "/inventory/intake" }];
  return <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-accent/30 bg-black/40 p-6 shadow-2xl md:p-10" aria-labelledby="workspace-ready-heading">
    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Setup complete</p>
    <h1 id="workspace-ready-heading" className="text-4xl font-semibold text-white">Your DRX workspace is ready</h1>
    <p className="mt-3 text-text-secondary">Here’s what we created. You can change these settings whenever you need to.</p>
    <dl className="mt-8 grid gap-3 md:grid-cols-2">
      <ReadyItem label="Business" value={summary.businessName}/><ReadyItem label="Owner" value={`${summary.ownerName} · Owner`}/>
      <ReadyItem label="Location" value={summary.locationName}/><ReadyItem label="Region" value={`${summary.currency} · ${summary.timezone}`}/>
      <ReadyItem label="Tax" value={summary.taxEnabled ? `Enabled at ${(summary.taxRateBps / 100).toFixed(2)}%` : "Not enabled"}/><ReadyItem label="Inventory" value={summary.inventoryEnabled ? "Tracking enabled" : "Not enabled"}/>
    </dl>
    <h2 className="mt-9 text-xl font-semibold text-white">What would you like to do first?</h2>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <a
        href={actions[0].href}
        onClick={() => capture("onboarding_first_action_selected", { platform: "web", action: actions[0].label })}
        className="rounded-full bg-accent px-6 py-3 text-center font-semibold text-black transition-colors hover:bg-accent/90"
      >
        {actions[0].label}
      </a>
      <a href={actions[1].href} className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white">
        {actions[1].label}
      </a>
      <a href="/pos/sale" className="px-5 py-3 text-center text-white">
        Go to workspace
      </a>
    </div>
  </section>;
}
function ReadyItem({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1 font-medium text-white">{value}</dd></div>; }
