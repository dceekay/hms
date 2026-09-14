import { FiCheck } from "react-icons/fi";
import {
  getInsuranceProviderMetadata,
  getInsuranceProviderStyle,
} from "../../constants/insuranceProviders";

type InsuranceProviderChipProps = {
  name: string;
  code?: string | null;
  selected?: boolean;
  compact?: boolean;
};

export default function InsuranceProviderChip({
  name,
  code,
  selected = false,
  compact = false,
}: InsuranceProviderChipProps) {
  const metadata = getInsuranceProviderMetadata(name, code);

  return (
    <span
      className={`insurance-provider-chip${selected ? " selected" : ""}${
        compact ? " compact" : ""
      }`}
      style={getInsuranceProviderStyle(name, code)}
    >
      <span className="insurance-provider-dot" aria-hidden="true" />
      <span>{name}</span>
      {!compact && <small>{code?.trim() || metadata.code}</small>}
      {selected && <FiCheck aria-hidden="true" />}
    </span>
  );
}
