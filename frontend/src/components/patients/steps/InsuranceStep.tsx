interface Props {
  patient: any;
  update: (field: string, value: any) => void;
}

export default function InsuranceStep({ patient, update }: Props) {
  return (
    <>
      <h2>Insurance Information</h2>

      <div className="wizard-grid">

        <div className="form-group">
          <label>Insurance Provider</label>
          <input
            value={patient.insuranceProvider}
            onChange={(e) => update("insuranceProvider", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Policy Number</label>
          <input
            value={patient.policyNumber}
            onChange={(e) => update("policyNumber", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Expiry Date</label>
          <input
            type="date"
            value={patient.expiryDate}
            onChange={(e) => update("expiryDate", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Coverage</label>
          <input
            value={patient.coverage}
            onChange={(e) => update("coverage", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Next of Kin</label>
          <input
            value={patient.nextOfKin}
            onChange={(e) => update("nextOfKin", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Relationship</label>
          <input
            value={patient.relationship}
            onChange={(e) => update("relationship", e.target.value)}
          />
        </div>

      </div>
    </>
  );
}