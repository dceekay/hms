interface Props {
  patient: any;
  update: (field: string, value: any) => void;
}

export default function ContactStep({ patient, update }: Props) {
  return (
    <>
      <h2>Contact Information</h2>

      <div className="wizard-grid">

        <div className="form-group">
          <label>Email</label>
          <input
            value={patient.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            value={patient.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Emergency Contact</label>
          <input
            value={patient.emergencyName}
            onChange={(e) => update("emergencyName", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Emergency Phone</label>
          <input
            value={patient.emergencyPhone}
            onChange={(e) => update("emergencyPhone", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Address</label>
          <input
            value={patient.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>City</label>
          <input
            value={patient.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>State</label>
          <input
            value={patient.state}
            onChange={(e) => update("state", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Country</label>
          <input
            value={patient.country}
            onChange={(e) => update("country", e.target.value)}
          />
        </div>

      </div>
    </>
  );
}