"use client";

import { useActionState, useEffect, useState } from "react";
import { completeOnboarding, type OnboardingActionState } from "../_actions";
import { createDraft, nextStep, ONBOARDING_DRAFT_KEY, previousStep, productBusiness, restoreDraft, validationMessage, type BusinessType, type OnboardingDraft, type OnboardingStep } from "@/lib/onboarding/state-machine";

const initialState: OnboardingActionState = { status: "idle", error: null };
const choices: Array<[BusinessType, string, string]> = [
  ["retail", "Retail store", "Sell products directly to customers from a location."],
  ["delivery", "Delivery-based", "Bring products or services to customers."], ["service", "Service business", "Sell time, appointments, or expertise."],
  ["wholesale", "Wholesale", "Sell products in bulk to other businesses."], ["hybrid", "Hybrid", "Combine products, services, or fulfillment methods."], ["other", "Other", "Start with flexible defaults."],
];
const numbered: OnboardingStep[] = ["ownerProfile", "businessName", "businessType", "location", "regionalSettings", "taxDecision", "taxDetails", "inventoryDecision", "teamDecision", "teamInvitation", "review"];

/**
 * Redirects to the dashboard after onboarding completes and clears the saved onboarding draft.
 *
 * @param completed - Whether onboarding has completed.
 * @param storage - Optional storage target for the completion flag and draft cleanup.
 * @param navigate - Optional navigation function used to redirect to the dashboard.
 */
export function OnboardingCompletionRedirect({ completed, storage, navigate }: { completed: boolean; storage?: Pick<Storage, "setItem"> & { removeItem?: Storage["removeItem"] }; navigate?: (path: string) => void }) {
  useEffect(() => { if (!completed) return; const target = storage ?? window.localStorage; try { target.setItem("drx_onboarding_complete", "true"); target.removeItem?.(ONBOARDING_DRAFT_KEY); } catch { /* Server state and the completion cookie remain authoritative. */ } finally { (navigate ?? ((path) => window.location.replace(path)))("/dashboard"); } }, [completed, navigate, storage]);
  return null;
}

/**
 * Renders a selectable button with a title and optional supporting detail.
 *
 * @param selected - Whether the option is currently selected.
 * @param title - The option title.
 * @param detail - Optional supporting description.
 * @param onClick - Invoked when the option is pressed.
 */
function Card({ selected, title, detail, onClick }: { selected: boolean; title: string; detail?: string; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-16 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent/10" : "border-white/15 bg-black/20 hover:border-white/35"}`}><strong className="block text-white">{title}</strong>{detail && <span className="mt-1 block text-sm text-text-secondary">{detail}</span>}</button>;
}

/**
 * Renders a multi-step onboarding wizard that collects, saves, validates, and submits business setup details.
 */
export function OnboardingForm() {
  const [result, action, pending] = useActionState(completeOnboarding, initialState);
  const [draft, setDraft] = useState(() => createDraft()); const [error, setError] = useState<string | null>(null); const [resumed, setResumed] = useState(false);
  useEffect(() => { const saved = restoreDraft(localStorage.getItem(ONBOARDING_DRAFT_KEY)); if (saved) { setDraft(saved); setResumed(saved.currentStep !== "welcome"); } }, []);
  useEffect(() => { if (draft.currentStep !== "completed") localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ ...draft, lastSavedAt: new Date().toISOString() })); }, [draft]);
  const patch = (value: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...value }));
  const advance = () => { const message = validationMessage(draft); if (message) return setError(message); setError(null); patch({ currentStep: nextStep(draft) }); };
  const back = () => { setError(null); patch({ currentStep: previousStep(draft) }); };
  const edit = (step: OnboardingStep) => patch({ currentStep: step });
  const step = draft.currentStep; const visibleSteps = numbered.filter((item) => item !== "taxDetails" || draft.taxChoice === "yes").filter((item) => item !== "inventoryDecision" || productBusiness(draft.businessType)).filter((item) => item !== "teamInvitation" || draft.inviteTeam);
  const position = Math.max(1, visibleSteps.indexOf(step) + 1);
  useEffect(() => { document.querySelector<HTMLElement>("#onboarding-heading")?.focus(); }, [step]);

  return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur md:p-10" aria-labelledby="onboarding-heading">
    <OnboardingCompletionRedirect completed={result.status === "success"} />
    {step !== "welcome" && <div className="mb-8"><div className="flex justify-between text-sm text-text-secondary"><span>Business setup, step {position} of {visibleSteps.length}</span><span aria-live="polite">Your progress is saved</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={visibleSteps.length} aria-valuenow={position} aria-label={`Business setup, step ${position} of ${visibleSteps.length}`}><div className="h-full bg-accent transition-all motion-reduce:transition-none" style={{ width: `${position / visibleSteps.length * 100}%` }} /></div></div>}
    {resumed && step !== "welcome" && <p className="mb-5 rounded-lg bg-accent/10 p-3 text-sm text-white">Welcome back. Let’s finish setting up your business.</p>}
    <div key={step} className="animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
      {step === "welcome" && <Intro title="Welcome to DRX" body="Let’s set up the essentials so you can start managing products, inventory, customers, and transactions." />}
      {step === "ownerProfile" && <Field title="What should your team call you?" body="This name appears in activity history and transaction records." label="Full name"><input autoFocus autoComplete="name" value={draft.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} className="input" /></Field>}
      {step === "businessName" && <Field title="What should we call your business?" body="You can update the public-facing name later." label="Business name"><input autoFocus value={draft.businessName} onChange={(e) => patch({ businessName: e.target.value })} className="input" /></Field>}
      {step === "businessType" && <Field title="What kind of business are you setting up?" body="Choose the closest fit. This only helps us recommend useful defaults."><div className="grid gap-3 md:grid-cols-2">{choices.map(([value,title,detail]) => <Card key={value} selected={draft.businessType === value} title={title} detail={detail} onClick={() => patch({ businessType: value, tracksInventory: value === "service" ? false : draft.tracksInventory })} />)}</div></Field>}
      {step === "location" && <Field title="Where does your business operate?" body="The street address is optional and stays internal unless you publish it later."><div className="grid gap-4 md:grid-cols-2"><Labeled label="Location name"><input value={draft.locationName} onChange={(e) => patch({ locationName:e.target.value })} className="input" /></Labeled><Labeled label="City"><input value={draft.city} onChange={(e) => patch({ city:e.target.value })} className="input" /></Labeled><Labeled label="State or region"><input value={draft.region} onChange={(e) => patch({ region:e.target.value })} className="input" /></Labeled><Labeled label="Country"><input value={draft.country} onChange={(e) => patch({ country:e.target.value })} className="input" /></Labeled></div></Field>}
      {step === "regionalSettings" && <Field title="Do these settings look right?" body="We suggested these from your device. You can change them now or later."><div className="grid gap-3 md:grid-cols-2"><Labeled label="Currency"><select value={draft.currency} onChange={(e) => patch({currency:e.target.value})} className="input"><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></select></Labeled><Labeled label="Time zone"><input value={draft.timezone} onChange={(e) => patch({timezone:e.target.value})} className="input" /></Labeled></div></Field>}
      {step === "taxDecision" && <Field title="Will you collect sales tax in DRX?" body="DRX can include tax in transaction totals. Confirm the correct rules and rate for your business."><div className="grid gap-3"><Card title="Yes" selected={draft.taxChoice === "yes"} onClick={() => patch({taxChoice:"yes"})}/><Card title="Not right now" selected={draft.taxChoice === "later"} onClick={() => patch({taxChoice:"later",taxRate:""})}/><Card title="I’m not sure" detail="Leave tax off for now and revisit it in Business Settings." selected={draft.taxChoice === "unsure"} onClick={() => patch({taxChoice:"unsure",taxRate:""})}/></div></Field>}
      {step === "taxDetails" && <Field title="What default tax rate should DRX use?" body="You can configure supported product and location overrides later." label="Tax rate (%)"><input autoFocus inputMode="decimal" placeholder="8.25" value={draft.taxRate} onChange={(e) => patch({taxRate:e.target.value})} className="input" /></Field>}
      {step === "inventoryDecision" && <Field title="Would you like DRX to track inventory quantities?" body="Inventory tracking helps prevent overselling and records stock received, sold, adjusted, and returned."><div className="grid gap-3"><Card title="Yes, track inventory" selected={draft.tracksInventory === true} onClick={() => patch({tracksInventory:true})}/><Card title="Not yet" selected={draft.tracksInventory === false} onClick={() => patch({tracksInventory:false})}/></div></Field>}
      {step === "teamDecision" && <Field title="Will anyone else use DRX with you?" body="You can assign access for managers, operators, and inventory staff."><div className="grid gap-3"><Card title="Invite someone now" selected={draft.inviteTeam === true} onClick={() => patch({inviteTeam:true})}/><Card title="I’ll do this later" selected={draft.inviteTeam === false} onClick={() => patch({inviteTeam:false})}/></div></Field>}
      {step === "teamInvitation" && <Field title="Who would you like to invite?" body="We’ll keep permissions simple. You can customize them later."><div className="grid gap-4"><Labeled label="Email"><input autoFocus type="email" value={draft.invitedUserEmail} onChange={(e) => patch({invitedUserEmail:e.target.value})} className="input" /></Labeled><Labeled label="Role"><select value={draft.invitedUserRole} onChange={(e) => patch({invitedUserRole:e.target.value})} className="input"><option value="manager">Manager</option><option value="operator">Operator</option><option value="inventory">Inventory</option></select></Labeled></div></Field>}
      {step === "review" && <form action={action}><Intro title="Review your setup" body="Everything here can be changed later in Business Settings."/><div className="grid gap-3 md:grid-cols-2"><Summary title="Owner" value={`${draft.ownerName} · Owner`} edit={() => edit("ownerProfile")}/><Summary title="Business" value={`${draft.businessName} · ${draft.businessType}`} edit={() => edit("businessName")}/><Summary title="Location" value={`${draft.locationName}${draft.city ? ` · ${draft.city}`:""}`} edit={() => edit("location")}/><Summary title="Region" value={`${draft.currency} · ${draft.timezone}`} edit={() => edit("regionalSettings")}/><Summary title="Tax" value={draft.taxChoice === "yes" ? `Enabled at ${draft.taxRate}%` : "Not enabled"} edit={() => edit("taxDecision")}/><Summary title="Inventory" value={draft.tracksInventory ? "Tracking enabled" : "Not enabled"} edit={() => edit(productBusiness(draft.businessType) ? "inventoryDecision" : "businessType")}/></div>{Object.entries(draft).map(([name,value]) => <input key={name} type="hidden" name={name} value={typeof value === "boolean" ? String(value) : value ?? ""}/>)}<Navigation back={back} primary="Create My Workspace" pending={pending}/></form>}
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {step !== "review" && <Navigation back={step === "welcome" ? undefined : back} primary={step === "welcome" ? "Set Up My Business" : "Continue"} onPrimary={advance}/>}
  </section>;
}

/**
 * Renders an onboarding heading and supporting description.
 *
 * @param title - The heading text.
 * @param body - The supporting description text.
 */
function Intro({title,body}:{title:string;body:string}) { return <><h1 id="onboarding-heading" tabIndex={-1} ref={undefined} className="text-3xl font-semibold text-white">{title}</h1><p className="mt-3 mb-7 text-text-secondary">{body}</p></>; }
/**
 * Renders a titled onboarding field section with descriptive text and optional labeling.
 *
 * @param title - The section heading.
 * @param body - The descriptive text below the heading.
 * @param label - An optional label applied to the child content.
 * @param children - The section content.
 */
function Field({title,body,label,children}:{title:string;body:string;label?:string;children:React.ReactNode}) { return <><h2 id="onboarding-heading" tabIndex={-1} className="text-3xl font-semibold text-white">{title}</h2><p className="mt-3 mb-7 text-text-secondary">{body}</p>{label ? <Labeled label={label}>{children}</Labeled>:children}</>; }
/**
 * Renders a styled form label with its associated content.
 *
 * @param label - The text displayed for the label
 * @param children - The form control or content associated with the label
 */
function Labeled({label,children}:{label:string;children:React.ReactNode}) { return <label className="grid gap-2 text-sm text-white"><span>{label}</span>{children}</label>; }
/**
 * Displays a review summary with an option to edit the corresponding onboarding value.
 *
 * @param title - The summary field label
 * @param value - The summary field value
 * @param edit - Invoked when the user selects the edit action
 */
function Summary({title,value,edit}:{title:string;value:string;edit:()=>void}) { return <div className="rounded-xl border border-white/10 p-4"><div className="flex justify-between"><strong className="text-white">{title}</strong><button type="button" onClick={edit} className="text-sm text-accent">Edit</button></div><p className="mt-2 text-sm text-text-secondary">{value}</p></div>; }
/**
 * Renders navigation controls for an onboarding step or submission form.
 *
 * @param back - Optional callback invoked when the Back button is pressed.
 * @param primary - Label for the primary action button.
 * @param onPrimary - Optional callback for advancing the wizard; when omitted, the primary button submits its form.
 * @param pending - Whether to disable the primary button and show its pending label.
 */
function Navigation({back,primary,onPrimary,pending=false}:{back?:()=>void;primary:string;onPrimary?:()=>void;pending?:boolean}) { return <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6">{back ? <button type="button" onClick={back} className="min-h-11 px-4 text-white">Back</button>:<span/>}<button type={onPrimary ? "button":"submit"} onClick={onPrimary} disabled={pending} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-black disabled:opacity-50">{pending ? "Creating your DRX workspace…":primary}</button></div>; }
