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
