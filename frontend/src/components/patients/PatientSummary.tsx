interface Props {
  patient: any;
}

export default function PatientSummary({
  patient
}: Props) {
  return (
    <aside className="patient-summary">

      <div className="summary-avatar">

        {patient.firstName
          ? patient.firstName.charAt(0)
          : "?"}

      </div>

      <h2>
        {patient.firstName} {patient.lastName}
      </h2>

      <p>{patient.gender}</p>

      <hr />

      <div className="summary-item">
        <span>Email</span>
        <strong>{patient.email || "-"}</strong>
      </div>

      <div className="summary-item">
        <span>Phone</span>
        <strong>{patient.phone || "-"}</strong>
      </div>

      <div className="summary-item">
        <span>Blood Group</span>
        <strong>{patient.bloodGroup || "-"}</strong>
      </div>

      <div className="summary-item">
        <span>Insurance</span>
        <strong>{patient.insuranceProvider || "-"}</strong>
      </div>

    </aside>
  );
}