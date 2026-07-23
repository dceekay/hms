interface Props {
  patient: any;
  update: (field: string, value: any) => void;
}

export default function PersonalStep({ patient, update }: Props) {
  return (
    <>
      <h2>Personal Information</h2>

      <div className="wizard-grid">

        <div className="form-group">
          <label>First Name</label>
          <input
            value={patient.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Middle Name</label>
          <input
            value={patient.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Last Name</label>
          <input
            value={patient.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            value={patient.dob}
            onChange={(e) => update("dob", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Gender</label>
          <select
            value={patient.gender}
            onChange={(e) => update("gender", e.target.value)}
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Blood Group</label>
          <select
            value={patient.bloodGroup}
            onChange={(e) => update("bloodGroup", e.target.value)}
          >
            <option value="">Select</option>
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>AB+</option>
            <option>AB-</option>
            <option>O+</option>
            <option>O-</option>
          </select>
        </div>

        <div className="form-group">
          <label>Marital Status</label>
          <input
            value={patient.maritalStatus}
            onChange={(e) => update("maritalStatus", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Nationality</label>
          <input
            value={patient.nationality}
            onChange={(e) => update("nationality", e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Occupation</label>
          <input
            value={patient.occupation}
            onChange={(e) => update("occupation", e.target.value)}
          />
        </div>

      </div>
    </>
  );
}