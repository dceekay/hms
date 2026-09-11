import type { CSSProperties } from "react";

export type InsuranceProviderMetadata = {
  name: string;
  code: string;
  accent: string;
};

export const CANONICAL_INSURANCE_PROVIDERS: readonly InsuranceProviderMetadata[] = [
  { name: "AXA Mansard", code: "AXA", accent: "#ef4444" },
  { name: "Novo", code: "NOVO", accent: "#8b5cf6" },
  { name: "Hygiea", code: "HYGIEA", accent: "#06b6d4" },
  { name: "Total Health Trust", code: "THT", accent: "#f59e0b" },
  { name: "Avon", code: "AVON", accent: "#ec4899" },
  { name: "SUNU", code: "SUNU", accent: "#eab308" },
  { name: "Reliance", code: "RELIANCE", accent: "#10b981" },
  { name: "Leadway", code: "LEADWAY", accent: "#3b82f6" },
  { name: "Aspire", code: "ASPIRE", accent: "#f97316" },
  { name: "Mass Life", code: "MASSLIFE", accent: "#14b8a6" },
  { name: "NEM", code: "NEM", accent: "#6366f1" },
  { name: "DOT", code: "DOT", accent: "#84cc16" },
  { name: "Kennedia", code: "KENNEDIA", accent: "#d946ef" },
  { name: "Philip", code: "PHILIP", accent: "#0ea5e9" },
  { name: "Aman", code: "AMAN", accent: "#22c55e" },
  { name: "MB and O", code: "MB-O", accent: "#a855f7" },
  { name: "Bastion", code: "BASTION", accent: "#64748b" },
  { name: "Hadiel", code: "HADIEL", accent: "#fb7185" },
  { name: "Zenor", code: "ZENOR", accent: "#0284c7" },
  { name: "HCI", code: "HCI", accent: "#9333ea" },
  { name: "Grooming", code: "GROOMING", accent: "#16a34a" },
  { name: "Life Worth", code: "LIFEWORTH", accent: "#ca8a04" },
  { name: "Woot Health", code: "WOOT", accent: "#0891b2" },
  { name: "NNPC", code: "NNPC", accent: "#15803d" },
] as const;

const FALLBACK_ACCENTS = [
  "#2563eb",
  "#0d9488",
  "#c2410c",
  "#7c3aed",
  "#be123c",
  "#0369a1",
  "#4d7c0f",
  "#a21caf",
  "#b45309",
  "#4338ca",
] as const;

const normalizeProviderKey = (value?: string | null) =>
  (value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getInsuranceProviderMetadata(
  name: string,
  code?: string | null
): InsuranceProviderMetadata {
  const normalizedName = normalizeProviderKey(name);
  const normalizedCode = normalizeProviderKey(code);
  const canonical = CANONICAL_INSURANCE_PROVIDERS.find(
    (provider) =>
      normalizeProviderKey(provider.name) === normalizedName ||
      (normalizedCode && normalizeProviderKey(provider.code) === normalizedCode)
  );

  if (canonical) return canonical;

  const fallbackKey = normalizedName || normalizedCode || "provider";
  return {
    name: name.trim() || "Insurance provider",
    code: code?.trim() || "HMO",
    accent: FALLBACK_ACCENTS[stableHash(fallbackKey) % FALLBACK_ACCENTS.length],
  };
}

export function getInsuranceProviderStyle(
  name: string,
  code?: string | null
): CSSProperties {
  return {
    "--provider-accent": getInsuranceProviderMetadata(name, code).accent,
  } as CSSProperties;
}
