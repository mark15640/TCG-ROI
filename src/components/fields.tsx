import { useEffect, useState, type ReactNode } from 'react';

export const usd = (n: number, digits = 2) =>
  (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  /** Allow clearing the field to `null`. */
  nullable?: boolean;
  ariaLabel?: string;
  className?: string;
}

/** Number field that lets you type freely and commits only valid numbers. */
export function NumberInput({
  value,
  onChange,
  step = 0.01,
  min = 0,
  prefix,
  suffix,
  placeholder,
  nullable = false,
  ariaLabel,
  className,
}: NumberInputProps) {
  const [text, setText] = useState(value === null ? '' : String(value));

  useEffect(() => {
    // Only resync when the external value changes, so a half-typed or cleared field isn't overwritten.
    const parsed = text === '' ? (nullable ? null : 0) : Number(text);
    if (parsed !== value) setText(value === null ? '' : String(value));
  }, [value]);

  return (
    <span className={`num-input ${className ?? ''}`}>
      {prefix && <span className="affix">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (t === '') {
            onChange(nullable ? null : 0);
            return;
          }
          const n = Number(t);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {suffix && <span className="affix">{suffix}</span>}
    </span>
  );
}

/** Edits a 0–1 rate as a percentage. */
export function PercentInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}) {
  return (
    <NumberInput
      value={+(value * 100).toFixed(4)}
      onChange={(v) => onChange((v ?? 0) / 100)}
      step={0.1}
      suffix="%"
      ariaLabel={ariaLabel}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
