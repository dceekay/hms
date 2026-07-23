import { useState } from "react";

import ProgressBar from "./ProgressBar";
import WizardNavigation from "./WizardNavigation";
import PatientSummary from "./PatientSummary";

import PersonalStep from "./steps/PersonalStep";
import ContactStep from "./steps/ContactStep";
import MedicalStep from "./steps/MedicalStep";
import InsuranceStep from "./steps/InsuranceStep";
import ReviewStep from "./steps/ReviewStep";

import "../../styles/wizard.css";

const initialPatient = {
  firstName: "",
  middleName: "",
  lastName: "",

  gender: "",

  dob: "",

  bloodGroup: "",

  maritalStatus: "",

  nationality: "",

  occupation: "",

  email: "",

  phone: "",

  emergencyName: "",

  emergencyPhone: "",

  address: "",

  city: "",

  state: "",

  country: "",

  allergies: "",

  conditions: "",

  medications: "",

  doctor: "",

  department: "",

  notes: "",

  insuranceProvider: "",

  policyNumber: "",

  expiryDate: "",

  coverage: "",

  nextOfKin: "",

  relationship: ""
};

export default function PatientWizard() {
  const [step, setStep] = useState(0);

  const [patient, setPatient] = useState(initialPatient);

  const steps = [
    "Personal",
    "Contact",
    "Medical",
    "Insurance",
    "Review"
  ];

  function update(field: string, value: any) {
    setPatient((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <PersonalStep
            patient={patient}
            update={update}
          />
        );

      case 1:
        return (
          <ContactStep
            patient={patient}
            update={update}
          />
        );

      case 2:
        return (
          <MedicalStep
            patient={patient}
            update={update}
          />
        );

      case 3:
        return (
          <InsuranceStep
            patient={patient}
            update={update}
          />
        );

      default:
        return <ReviewStep patient={patient} />;
    }
  }

  return (
    <div className="wizard-layout">

      <div className="wizard-main">

        <ProgressBar
          current={step}
          steps={steps}
        />

        <div className="wizard-card">
          {renderStep()}
        </div>

        <WizardNavigation
          current={step}
          total={steps.length}
          previous={() => setStep(step - 1)}
          next={() => setStep(step + 1)}
          finish={() => console.log(patient)}
        />

      </div>

      <PatientSummary patient={patient} />

    </div>
  );
}