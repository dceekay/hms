import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiCreditCard, FiSearch, FiShield, FiX } from "react-icons/fi";
import type { PatientInsuranceProvider } from "../../types/patient";
import InsuranceProviderChip from "./InsuranceProviderChip";

type InsuranceProviderPickerProps = {
  providers: PatientInsuranceProvider[];
  value: string;
  onChange: (providerId: string) => void;
  loading?: boolean;
};

export default function InsuranceProviderPicker({
  providers,
  value,
  onChange,
  loading = false,
}: InsuranceProviderPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedProvider = providers.find((provider) => provider.id === value);

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return providers;

    return providers.filter((provider) =>
      `${provider.name} ${provider.code ?? ""}`.toLocaleLowerCase().includes(query)
    );
  }, [providers, search]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".insurance-picker-trigger")?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    // CRITICAL: Do NOT auto-focus on touch/mobile devices because doing so immediately
    // summons the virtual keyboard, shrinking the screen and obscuring the list of insurances.
    const isTouch =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        window.innerWidth <= 768 ||
        /iphone|ipad|ipod|android/i.test(navigator.userAgent));

    if (!isTouch) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectProvider = (providerId: string) => {
    onChange(providerId);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="insurance-picker-field">
      <span className="insurance-picker-label" id="insurance-provider-label">
        Insurance provider <span className="optional-field">optional</span>
      </span>
      <div className="insurance-provider-picker" ref={rootRef}>
        <button
          type="button"
          className="insurance-picker-trigger"
          aria-labelledby="insurance-provider-label insurance-provider-value"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="insurance-provider-listbox"
          disabled={loading}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span id="insurance-provider-value" className="insurance-picker-value">
            {loading ? (
              <span className="insurance-picker-loading">Loading providers...</span>
            ) : selectedProvider ? (
              <InsuranceProviderChip
                name={selectedProvider.name}
                code={selectedProvider.code}
                selected
              />
            ) : (
              <span className="self-pay-chip">
                <FiCreditCard aria-hidden="true" />
                <span>Self pay</span>
                <small>No insurance</small>
              </span>
            )}
          </span>
          <FiChevronDown className="insurance-picker-chevron" aria-hidden="true" />
        </button>

        {open && !loading && (
          <>
            <div
              className="insurance-picker-backdrop"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="insurance-picker-menu">
              <div className="insurance-picker-mobile-header">
                <div className="insurance-picker-mobile-title">
                  <FiShield className="insurance-picker-title-icon" aria-hidden="true" />
                  <div>
                    <h4>Select Insurance Provider</h4>
                    <small>{providers.length} HMOs available</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="insurance-picker-close-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Close insurance list"
                >
                  <FiX />
                </button>
              </div>

              <div className="insurance-picker-search">
                <FiSearch aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search HMO (e.g. AXA, NHIA, Hygiea)..."
                  aria-label="Search insurance providers"
                />
              </div>

            <div
              id="insurance-provider-listbox"
              className="insurance-picker-options"
              role="listbox"
              aria-labelledby="insurance-provider-label"
            >
              <button
                type="button"
                className={`insurance-picker-option self-pay-option${!value ? " selected" : ""}`}
                role="option"
                aria-selected={!value}
                onClick={() => selectProvider("")}
              >
                <span className="self-pay-chip">
                  <FiCreditCard aria-hidden="true" />
                  <span>Self pay</span>
                </span>
                {!value && <FiCheck aria-label="Selected" />}
              </button>

              {filteredProviders.map((provider) => {
                const selected = provider.id === value;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    className={`insurance-picker-option${selected ? " selected" : ""}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectProvider(provider.id)}
                  >
                    <InsuranceProviderChip
                      name={provider.name}
                      code={provider.code}
                      selected={selected}
                    />
                    <span className="sr-only">{selected ? "Selected" : "Select provider"}</span>
                  </button>
                );
              })}

              {filteredProviders.length === 0 && (
                <p className="insurance-picker-empty">No matching providers.</p>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
