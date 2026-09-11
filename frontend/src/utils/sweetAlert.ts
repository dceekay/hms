import Swal from "sweetalert2";
import { playSuccessChime, playConfirmChime } from "./soundAlerts";
import "../styles/sweetalert.css";

// MDS Hospital custom themed SweetAlert2 instance
const MdsSwal = Swal.mixin({
  customClass: {
    popup: "mds-swal-popup",
    title: "mds-swal-title",
    htmlContainer: "mds-swal-text",
    confirmButton: "btn btn-primary mds-swal-confirm",
    denyButton: "btn btn-outline mds-swal-deny",
    cancelButton: "btn btn-secondary mds-swal-cancel",
  },
  buttonsStyling: false,
});

export interface ConfirmActionOptions {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: "question" | "warning" | "info";
  danger?: boolean;
}

/**
 * Display an MDS Hospital styled confirmation dialog ("Are you sure?")
 * Returns true if confirmed, false if dismissed.
 */
export async function confirmImportantAction({
  title,
  text = "",
  confirmButtonText = "Yes, Proceed",
  cancelButtonText = "Cancel",
  icon = "question",
  danger = false,
}: ConfirmActionOptions): Promise<boolean> {
  playConfirmChime();

  const result = await MdsSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: danger,
    confirmButtonColor: danger ? "#dc2626" : "#087ebd",
  });

  return result.isConfirmed;
}

/**
 * Play the MDS success chime and show an authenticated success alert modal or toast
 */
export async function showSuccessWithSound({
  title,
  text = "",
  timer = 2200,
}: {
  title: string;
  text?: string;
  timer?: number;
}): Promise<void> {
  playSuccessChime();

  await MdsSwal.fire({
    icon: "success",
    title,
    text,
    timer,
    timerProgressBar: true,
    showConfirmButton: timer > 3000,
    confirmButtonText: "Done",
  });
}

/**
 * Show error or rejection alert
 */
export async function showErrorAlert({
  title,
  text = "",
}: {
  title: string;
  text?: string;
}): Promise<void> {
  await MdsSwal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "Dismiss",
  });
}

export interface PatientCreatedAlertOptions {
  patientName: string;
  mrn?: string | null;
  category?: string;
}

/**
 * Rich alert with sound played whenever a patient is successfully registered
 */
export async function showPatientCreatedAlert({
  patientName,
  mrn,
  category,
}: PatientCreatedAlertOptions): Promise<"print" | "another" | "dismiss"> {
  playSuccessChime();

  const formattedCategory = category
    ? category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Hospital Patient";

  const result = await MdsSwal.fire({
    icon: "success",
    title: "Patient Registered Successfully!",
    html: `
      <div style="display: flex; flex-direction: column; gap: 10px; align-items: center; margin: 8px 0;">
        <div style="font-size: 1.2rem; font-weight: 700; color: #0f172a;">${patientName}</div>
        <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: #e0f2fe; border: 1.5px solid #0284c7; border-radius: 9999px; font-weight: 700; font-size: 0.95rem; color: #0369a1;">
          <span>MRN:</span>
          <span style="font-family: monospace; letter-spacing: 0.05em; font-size: 1.05rem;">${mrn || "Assigned"}</span>
        </div>
        <div style="font-size: 0.82rem; color: #64748b; font-weight: 600;">Category: ${formattedCategory}</div>
        <div style="font-size: 0.85rem; color: #0f766e; background: #f0fdfa; padding: 6px 12px; border-radius: 6px; border: 1px solid #ccfbf1;">
          ✓ Patient ID Card & QR lookup code generated ready to print
        </div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "🖨️ Print ID Card",
    denyButtonText: "➕ Register Another",
    cancelButtonText: "Close",
    reverseButtons: false,
    focusConfirm: true,
  });

  if (result.isConfirmed) {
    return "print";
  }
  if (result.isDenied) {
    return "another";
  }
  return "dismiss";
}
