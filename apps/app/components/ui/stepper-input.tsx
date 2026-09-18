"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperInputProps {
  id?: string;
  name?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Calculates decimal precision from a step value (e.g. 0.01 -> 2 decimals).
 */
function getStepPrecision(step: number): number {
  const stepStr = step.toString();
  if (stepStr.includes(".")) {
    return stepStr.split(".")[1].length;
  }
  return 0;
}

/**
 * Touch-friendly numeric stepper with flanking [-] and [+] controls.
 * Ideal for iPad, mobile, and desktop touch surfaces.
 */
export function StepperInput({
  id,
  name,
  value,
  defaultValue = 0,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  placeholder,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: StepperInputProps) {
  const precision = getStepPrecision(step);

  const formatVal = React.useCallback(
    (val: number) => {
      return precision > 0 ? parseFloat(val.toFixed(precision)) : Math.round(val);
    },
    [precision]
  );

  const [internalValue, setInternalValue] = React.useState<number>(
    value !== undefined ? value : defaultValue
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const updateValue = (next: number) => {
    let clamped = next;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    clamped = formatVal(clamped);

    setInternalValue(clamped);
    onChange?.(clamped);
  };

  const handleDecrease = () => {
    if (disabled) return;
    updateValue(internalValue - step);
  };

  const handleIncrease = () => {
    if (disabled) return;
    updateValue(internalValue + step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setInternalValue(0);
      onChange?.(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setInternalValue(parsed);
      onChange?.(parsed);
    }
  };

  const handleBlur = () => {
    updateValue(internalValue);
  };

  const isMinReached = min !== undefined && internalValue <= min;
  const isMaxReached = max !== undefined && internalValue >= max;

  return (
    <div
      className={cn(
        "flex h-11 w-full items-center rounded-lg border border-white/20 bg-[#1e1e1e] p-1 shadow-xs transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={handleDecrease}
        disabled={disabled || isMinReached}
        aria-label={`Decrease ${ariaLabel || name || "value"}`}
        className="flex h-9 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition-all hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>

      <div className="relative flex min-w-0 flex-1 items-center justify-center px-2">
        <input
          id={id}
          name={name}
          type="number"
          step={step}
          min={min}
          max={max}
          value={isNaN(internalValue) ? "" : internalValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          className="w-full bg-transparent text-center font-mono text-base font-semibold text-white outline-none selection:bg-accent selection:text-black [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none md:text-sm"
        />
        {unit && (
          <span className="pointer-events-none ml-1 select-none text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>

      <button
        type="button"
        tabIndex={-1}
        onClick={handleIncrease}
        disabled={disabled || isMaxReached}
        aria-label={`Increase ${ariaLabel || name || "value"}`}
        className="flex h-9 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition-all hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
