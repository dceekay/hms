import { FiCreditCard, FiRefreshCw, FiShield } from "react-icons/fi";
import { Patient, PatientQr } from "../../types/patient";

function QrPattern({ value }: { value: string }) {
  const cells = Array.from({ length: 81 }, (_, index) => {
    const charCode = value.charCodeAt(index % value.length);
    return (charCode + index * 7) % 3 !== 0;
  });

  return (
    <div className="patient-qr-pattern" aria-label={`QR lookup code ${value}`}>
      {cells.map((active, index) => (
        <span key={`${value}-${index}`} className={active ? "active" : ""} />
      ))}
    </div>
  );
}

export function PatientIdCard({
  patient,
  patientQr,
  emptyMessage = "ID card not generated yet.",
}: {
  patient: Patient;
  patientQr: PatientQr | null;
  emptyMessage?: string;
}) {
  return (
    <div className="patient-id-card">
      <div>
        <p>CeekayX HMS</p>
        <strong>
          {patient.firstName} {patient.lastName}
        </strong>
        <span>{patient.gender}</span>
      </div>

      <div className="id-mrn">
        <span>Searchable MRN</span>
        <strong>{patient.mrn}</strong>
      </div>

      {patientQr ? (
        <>
          <QrPattern value={patientQr.qrCode} />
          <code>{patientQr.qrCode}</code>
          <small>{patientQr.lookupPath}</small>
        </>
      ) : (
        <div className="id-empty-qr">
          <FiRefreshCw />
          <span>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
}

export function PatientIdPanel({
  patient,
  patientQr,
}: {
  patient: Patient | null;
  patientQr: PatientQr | null;
}) {
  return (
    <>
      <div className="id-panel-header">
        <FiCreditCard />
        <div>
          <h2>Patient ID</h2>
          <p>Generated after successful registration.</p>
        </div>
      </div>

      {!patient && (
        <div className="id-empty-state">
          <FiShield />
          <p>Register a patient to generate a searchable MRN and QR lookup card.</p>
        </div>
      )}

      {patient && <PatientIdCard patient={patient} patientQr={patientQr} />}
    </>
  );
}
