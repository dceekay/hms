interface Props {
  patient: any;
  update: (field: string, value: any) => void;
}

export default function MedicalStep({ patient, update }: Props) {
  return (
    <>
      <h2>Medical Information</h2>

      <div className="wizard-grid">

        <div className="form-group">
          <label>Primary Doctor</label>
          <input
            value={patient.doctor}
            onChange={(e) => update("doctor", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            value={patient.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Known Allergies</label>
          <textarea
            rows={3}
            value={patient.allergies}
            onChange={(e) => update("allergies", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Existing Conditions</label>
          <textarea
            rows={3}
            value={patient.conditions}
            onChange={(e) => update("conditions", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Current Medications</label>
          <textarea
            rows={3}
            value={patient.medications}
            onChange={(e) => update("medications", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Notes</label>
          <textarea
            rows={4}
            value={patient.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

      </div>
    </>
  );
}