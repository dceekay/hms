import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { patientSchema, PatientFormValues } from "../../types/patient";
import { createPatient } from "../../services/patients/patientService";
import { NavBar } from "../../components/NavBar";

export function PatientRegistrationPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
  });

  async function onSubmit(values: PatientFormValues) {
    setError(null);
    setSuccess(null);

    const result = await createPatient(values);
    if (result) {
      setSuccess("Patient registered successfully.");
      reset();
      return;
    }

    setError("Failed to create patient. Please try again.");
  }

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div className="card">
          <h1>Patient Registration</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label>
              First Name
              <input type="text" {...register("firstName")} />
              {errors.firstName && <span className="error-text">{errors.firstName.message}</span>}
            </label>

            <label>
              Last Name
              <input type="text" {...register("lastName")} />
              {errors.lastName && <span className="error-text">{errors.lastName.message}</span>}
            </label>

            <label>
              Email
              <input type="email" {...register("email")} />
              {errors.email && <span className="error-text">{errors.email.message}</span>}
            </label>

            <label>
              Phone
              <input type="text" {...register("phone")} />
              {errors.phone && <span className="error-text">{errors.phone.message}</span>}
            </label>

            <label>
              Date of Birth
              <input type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth.message}</span>}
            </label>

            <label>
              Gender
              <select {...register("gender")}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <span className="error-text">{errors.gender.message}</span>}
            </label>

            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Patient"}
            </button>
          </form>

          {success && <p className="success-text">{success}</p>}
          {error && <p className="error-text">{error}</p>}
        </div>
      </main>
    </>
  );
}
