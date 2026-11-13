import QRCode from "qrcode";
import mdsLogo from "../assets/optimized/logo.png";
import { HOSPITAL_OFFICIAL_DETAILS } from "../constants/hospitalInfo";
import type { Patient } from "../types/patient";
import type { ClinicalEncounter } from "../types/clinical";
import type { Appointment } from "../types/appointment";

const UPLOADED_STAMP_KEY = "hms_official_stamp_data_url";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function calcAge(dateOfBirth?: string) {
  if (!dateOfBirth) return "N/A";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return `${Math.max(0, age)} yrs`;
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveLogoUrl() {
  if (typeof window === "undefined") return mdsLogo;
  return mdsLogo.startsWith("data:") || mdsLogo.startsWith("http")
    ? mdsLogo
    : new URL(mdsLogo, window.location.origin).href;
}

function buildOfficialStampHtml(dateLabel: string, departmentLabel = "MEDICAL DIRECTORATE") {
  let uploadedStamp: string | null = null;
  try {
    uploadedStamp = typeof window !== "undefined" ? window.localStorage.getItem(UPLOADED_STAMP_KEY) : null;
  } catch {
    uploadedStamp = null;
  }

  if (uploadedStamp) {
    return `
      <div class="stamp-box">
        <img src="${uploadedStamp}" alt="Official Hospital Stamp" class="uploaded-stamp-img" />
        <div class="stamp-date">${escapeHtml(dateLabel)}</div>
      </div>
    `;
  }

  return `
    <div class="stamp-box" aria-label="Official Hospital Stamp">
      <svg viewBox="0 0 180 180" width="118" height="118" class="svg-stamp">
        <circle cx="90" cy="90" r="82" fill="none" stroke="#0b4f8c" stroke-width="4" />
        <circle cx="90" cy="90" r="74" fill="none" stroke="#0b4f8c" stroke-width="1.5" stroke-dasharray="4 3" />
        <circle cx="90" cy="90" r="50" fill="none" stroke="#0b4f8c" stroke-width="1.5" />
        <text x="90" y="32" text-anchor="middle" fill="#0b4f8c" font-size="9.5" font-weight="800" letter-spacing="1.2">MDS SPECIALIST HOSPITAL</text>
        <text x="90" y="156" text-anchor="middle" fill="#0b4f8c" font-size="9" font-weight="800" letter-spacing="1">GIGINYU • KANO STATE</text>
        <text x="90" y="80" text-anchor="middle" fill="#0b4f8c" font-size="11" font-weight="900">VERIFIED</text>
        <text x="90" y="95" text-anchor="middle" fill="#0b4f8c" font-size="10.5" font-weight="900">DR VISIT</text>
        <text x="90" y="110" text-anchor="middle" fill="#0b4f8c" font-size="7.5" font-weight="700">${escapeHtml(departmentLabel)}</text>
        <text x="90" y="123" text-anchor="middle" fill="#0b4f8c" font-size="8" font-weight="700">${escapeHtml(dateLabel)}</text>
      </svg>
    </div>
  `;
}

async function generateVerificationQr(payload: Record<string, unknown>): Promise<string> {
  try {
    return await QRCode.toDataURL(JSON.stringify(payload), {
      margin: 1,
      width: 140,
      color: { dark: "#092a5e", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

function openPrintWindow(html: string) {
  const printWindow = window.open("", "_blank", "width=920,height=960");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

export async function printManualDoctorVisitSlip(options: {
  patient: Patient;
  doctorName?: string;
  consultationType?: string;
  reason?: string;
  notes?: string;
  scheduledFor?: string;
}) {
  const { patient, doctorName, consultationType, reason, notes, scheduledFor } = options;
  const hospital = HOSPITAL_OFFICIAL_DETAILS;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const insuranceLabel =
    typeof patient.insuranceProvider === "string"
      ? patient.insuranceProvider
      : patient.insuranceProvider?.name || "Self-Pay / Cash";
  const visitDate = scheduledFor ? new Date(scheduledFor) : new Date();
  const formattedDate = Number.isNaN(visitDate.getTime())
    ? new Date().toLocaleString("en-NG")
    : visitDate.toLocaleString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const shortDate = Number.isNaN(visitDate.getTime())
    ? new Date().toLocaleDateString("en-NG")
    : visitDate.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

  const origin = typeof window !== "undefined" ? window.location.origin : hospital.websiteUrl;
  const verifyUrl = `${origin}/verify-patient/${encodeURIComponent(patient.qrCode || patient.id)}`;
  const qrDataUrl = await generateVerificationQr({
    hospital: hospital.name,
    document: "Manual Doctor Visit Slip",
    patient: fullName,
    mrn: patient.mrn || "Pending",
    doctor: doctorName || "On-Duty Doctor",
    visitDate: formattedDate,
    verifyUrl,
  });

  const logoSrc = resolveLogoUrl();
  const stampHtml = buildOfficialStampHtml(shortDate, "CONSULTATION DESK");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Manual Doctor Visit Slip - ${escapeHtml(fullName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      background: #ffffff;
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      border-radius: 10px;
      padding: 20px 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-left img {
      width: 58px;
      height: 58px;
      object-fit: contain;
    }
    .header h1 {
      margin: 0 0 2px;
      font-size: 19px;
      color: #092a5e;
    }
    .header p {
      margin: 2px 0;
      font-size: 11.5px;
      color: #475569;
    }
    .doc-badge {
      border: 2px solid #0284c7;
      color: #0284c7;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .field small {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .field strong {
      font-size: 13px;
      color: #0f172a;
    }
    .vitals-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .vital-box {
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px;
      min-height: 48px;
    }
    .vital-box span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .write-box {
      border: 1px solid #94a3b8;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    .write-box h3 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      color: #334155;
      letter-spacing: 0.04em;
    }
    .lines {
      display: grid;
      gap: 18px;
      padding-top: 6px;
    }
    .line {
      border-bottom: 1px dashed #cbd5e1;
      height: 16px;
    }
    .verification-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
    }
    .qr-verify {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qr-verify img {
      width: 78px;
      height: 78px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px;
    }
    .qr-verify small {
      display: block;
      font-size: 10.5px;
      color: #475569;
      max-width: 190px;
    }
    .stamp-box {
      display: grid;
      place-items: center;
      text-align: center;
    }
    .uploaded-stamp-img {
      max-width: 115px;
      max-height: 95px;
      object-fit: contain;
    }
    .stamp-date {
      font-size: 10px;
      font-weight: 700;
      color: #0b4f8c;
      margin-top: 2px;
    }
    .sig {
      width: 200px;
      border-top: 1px solid #0f172a;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      align-self: flex-end;
    }
    @media print {
      body { padding: 0; }
      .sheet { border-width: 1.5px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand-left">
        <img src="${escapeHtml(logoSrc)}" alt="Cavendish Medical / MDS Logo" />
        <div>
          <h1>${escapeHtml(hospital.name)}</h1>
          <p>${escapeHtml(hospital.brandSubtitle)}</p>
          <p>${escapeHtml(hospital.shortAddress)} • ${escapeHtml(hospital.displayPhone)}</p>
        </div>
      </div>
      <div class="doc-badge">
        Manual Doctor Visit Slip<br />
        ${escapeHtml(formattedDate)}
      </div>
    </div>

    <div class="grid">
      <div class="field"><small>Patient Name</small><strong>${escapeHtml(fullName)}</strong></div>
      <div class="field"><small>Folder / Patient ID</small><strong>${escapeHtml(patient.physicalFileNumber || patient.mrn || "Pending")}</strong></div>
      <div class="field"><small>Age / Gender</small><strong>${escapeHtml(calcAge(patient.dateOfBirth))} • ${escapeHtml(patient.gender || "N/A")}</strong></div>
      <div class="field"><small>Phone Number</small><strong>${escapeHtml(patient.phone || "Not set")}</strong></div>
      <div class="field"><small>Insurance / Payment</small><strong>${escapeHtml(insuranceLabel)}</strong></div>
      <div class="field"><small>Assigned Doctor</small><strong>${escapeHtml(doctorName || "On-Duty Doctor")}</strong></div>
      <div class="field"><small>Visit Type</small><strong>${escapeHtml(consultationType || "Manual Doctor Consultation")}</strong></div>
      <div class="field" style="grid-column: span 2;"><small>Chief Complaint / Reason</small><strong>${escapeHtml(reason || "General consultation")}</strong></div>
    </div>

    <div class="vitals-row">
      <div class="vital-box"><span>BP (mmHg)</span></div>
      <div class="vital-box"><span>Temp (°C)</span></div>
      <div class="vital-box"><span>Pulse (bpm)</span></div>
      <div class="vital-box"><span>Weight (kg)</span></div>
      <div class="vital-box"><span>SpO2 (%)</span></div>
    </div>

    <div class="write-box">
      <h3>Doctor's History, Findings &amp; Diagnosis</h3>
      ${notes ? `<p style="margin:0 0 8px;font-size:12px;color:#334155;"><strong>Front Desk Note:</strong> ${escapeHtml(notes)}</p>` : ""}
      <div class="lines">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div>

    <div class="write-box">
      <h3>Prescription / Lab Investigations / Follow-Up Plan</h3>
      <div class="lines">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </div>

    <div class="verification-row">
      ${
        qrDataUrl
          ? `<div class="qr-verify">
              <img src="${qrDataUrl}" alt="Verify Doctor Visit QR" />
              <small><strong>Scan to Verify Dr Visit</strong><br />Patient: ${escapeHtml(fullName)}<br />MRN: ${escapeHtml(patient.mrn || "Pending")}</small>
            </div>`
          : `<div></div>`
      }
      ${stampHtml}
      <div class="sig">Doctor's Signature &amp; Date</div>
    </div>
  </div>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

  return openPrintWindow(html);
}

export async function printFullHospitalReport(options: {
  patient: Patient;
  encounters?: ClinicalEncounter[];
  appointments?: Appointment[];
  doctorName?: string;
}) {
  const { patient, encounters = [], appointments = [], doctorName } = options;
  const hospital = HOSPITAL_OFFICIAL_DETAILS;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const insuranceLabel =
    typeof patient.insuranceProvider === "string"
      ? patient.insuranceProvider
      : patient.insuranceProvider?.name || "Self-Pay / Cash";
  const generatedAt = new Date();
  const formattedNow = generatedAt.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const shortDate = generatedAt.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const latestEncounter = encounters[0];
  const latestDoctor =
    doctorName ||
    (latestEncounter?.doctor
      ? `Dr. ${latestEncounter.doctor.firstName} ${latestEncounter.doctor.lastName}`
      : "Attending Medical Officer");

  const origin = typeof window !== "undefined" ? window.location.origin : hospital.websiteUrl;
  const verifyUrl = `${origin}/verify-patient/${encodeURIComponent(patient.qrCode || patient.id)}`;
  const qrDataUrl = await generateVerificationQr({
    hospital: hospital.name,
    document: "Full Hospital Clinical & Doctor Visit Report",
    patient: fullName,
    mrn: patient.mrn || "Pending",
    latestVisitId: latestEncounter?.id || "N/A",
    doctor: latestDoctor,
    generatedAt: formattedNow,
    verifyUrl,
  });

  const logoSrc = resolveLogoUrl();
  const stampHtml = buildOfficialStampHtml(shortDate, "MEDICAL RECORDS");

  const encountersHtml =
    encounters.length > 0
      ? encounters
          .map(
            (enc) => `
        <div class="visit-card">
          <div class="visit-card-head">
            <strong>${escapeHtml(formatDateTime(enc.createdAt))}</strong>
            <span>${escapeHtml(enc.doctor ? `Dr. ${enc.doctor.firstName} ${enc.doctor.lastName}` : latestDoctor)}</span>
          </div>
          <div class="visit-grid">
            ${enc.chiefComplaint ? `<div><small>Chief Complaint</small><p>${escapeHtml(enc.chiefComplaint)}</p></div>` : ""}
            ${enc.diagnosis ? `<div><small>Diagnosis</small><p>${escapeHtml(enc.diagnosis)}</p></div>` : ""}
            ${enc.history ? `<div><small>History</small><p>${escapeHtml(enc.history)}</p></div>` : ""}
            ${enc.examination ? `<div><small>Examination</small><p>${escapeHtml(enc.examination)}</p></div>` : ""}
            ${enc.plan ? `<div><small>Treatment / Plan</small><p>${escapeHtml(enc.plan)}</p></div>` : ""}
            ${enc.remarks ? `<div class="full"><small>Doctor's Remarks</small><p>${escapeHtml(enc.remarks)}</p></div>` : ""}
          </div>
        </div>
      `
          )
          .join("")
      : `<p class="empty-note">No electronic clinical encounters recorded yet. Use the clinical notes section below for manual entry.</p>`;

  const appointmentsHtml =
    appointments.length > 0
      ? `<div class="section">
          <h3>Consultation Appointments (${appointments.length})</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Doctor</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${appointments
                .slice(0, 10)
                .map(
                  (appt) => `
                <tr>
                  <td>${escapeHtml(formatDateTime(appt.scheduledFor))}</td>
                  <td>${escapeHtml(appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "On-Duty Doctor")}</td>
                  <td>${escapeHtml(appt.reason || "Consultation")}</td>
                  <td>${escapeHtml(appt.status)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Full Hospital Report - ${escapeHtml(fullName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      background: #ffffff;
    }
    .report-sheet {
      max-width: 840px;
      margin: 0 auto;
      border: 2px solid #092a5e;
      border-radius: 10px;
      padding: 22px 26px;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid #092a5e;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand img {
      width: 68px;
      height: 68px;
      object-fit: contain;
    }
    .brand h1 {
      margin: 0 0 3px;
      font-size: 20px;
      color: #092a5e;
    }
    .brand p {
      margin: 2px 0;
      font-size: 11.5px;
      color: #475569;
    }
    .report-title-tag {
      text-align: right;
    }
    .report-title-tag span {
      display: inline-block;
      background: #092a5e;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .report-title-tag small {
      display: block;
      margin-top: 6px;
      color: #475569;
      font-size: 11px;
    }
    .patient-box {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .patient-box div small {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .patient-box div strong {
      font-size: 12.5px;
      color: #0f172a;
    }
    .section {
      margin-bottom: 16px;
    }
    .section h3 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #092a5e;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .visit-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #ffffff;
    }
    .visit-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      color: #092a5e;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 5px;
    }
    .visit-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .visit-grid .full {
      grid-column: 1 / -1;
    }
    .visit-grid small {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .visit-grid p {
      margin: 2px 0 0;
      font-size: 12px;
      color: #0f172a;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .report-table th, .report-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    .report-table th {
      background: #f1f5f9;
      font-size: 11px;
      text-transform: uppercase;
      color: #334155;
    }
    .empty-note {
      font-size: 12px;
      color: #64748b;
      font-style: italic;
    }
    .verification-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 2px solid #092a5e;
    }
    .qr-verify {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qr-verify img {
      width: 88px;
      height: 88px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px;
    }
    .qr-verify small {
      display: block;
      font-size: 10.5px;
      color: #334155;
      max-width: 210px;
      line-height: 1.4;
    }
    .stamp-box {
      display: grid;
      place-items: center;
      text-align: center;
    }
    .uploaded-stamp-img {
      max-width: 120px;
      max-height: 100px;
      object-fit: contain;
    }
    .stamp-date {
      font-size: 10px;
      font-weight: 700;
      color: #0b4f8c;
      margin-top: 2px;
    }
    .sig-box {
      width: 210px;
      text-align: center;
      align-self: flex-end;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 5px;
      font-size: 12px;
      font-weight: 700;
    }
    .sig-box small {
      color: #64748b;
      font-size: 10.5px;
    }
    @media print {
      body { padding: 0; }
      .report-sheet { border-width: 1.5px; }
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <div class="report-header">
      <div class="brand">
        <img src="${escapeHtml(logoSrc)}" alt="Cavendish Medical / MDS Logo" />
        <div>
          <h1>${escapeHtml(hospital.name)}</h1>
          <p>${escapeHtml(hospital.brandSubtitle)}</p>
          <p>${escapeHtml(hospital.shortAddress)}</p>
          <p>${escapeHtml(hospital.displayPhone)} • ${escapeHtml(hospital.email)}</p>
        </div>
      </div>
      <div class="report-title-tag">
        <span>Full Hospital Medical Report</span>
        <small>Generated: ${escapeHtml(formattedNow)}</small>
        <small>${escapeHtml(hospital.accreditation)}</small>
      </div>
    </div>

    <div class="patient-box">
      <div><small>Patient Full Name</small><strong>${escapeHtml(fullName)}</strong></div>
      <div><small>MRN / Folder No</small><strong>${escapeHtml(patient.mrn || patient.physicalFileNumber || "Pending")}</strong></div>
      <div><small>Age / Gender</small><strong>${escapeHtml(calcAge(patient.dateOfBirth))} • ${escapeHtml(patient.gender || "N/A")}</strong></div>
      <div><small>Phone</small><strong>${escapeHtml(patient.phone || "Not set")}</strong></div>
      <div><small>Blood Group / Genotype</small><strong>${escapeHtml(patient.bloodGroup || "N/A")} / ${escapeHtml(patient.genotype || "N/A")}</strong></div>
      <div><small>Insurance / HMO</small><strong>${escapeHtml(insuranceLabel)}</strong></div>
      <div style="grid-column: span 2;"><small>Address</small><strong>${escapeHtml([patient.address, patient.city, patient.state].filter(Boolean).join(", ") || "Not set")}</strong></div>
    </div>

    <div class="section">
      <h3>Doctor Visits &amp; Clinical Encounters (${encounters.length})</h3>
      ${encountersHtml}
    </div>

    ${appointmentsHtml}

    <div class="verification-footer">
      ${
        qrDataUrl
          ? `<div class="qr-verify">
              <img src="${qrDataUrl}" alt="QR Code to Verify Doctor Visit" />
              <small>
                <strong>Verify Doctor Visit (QR)</strong><br />
                Scan to verify authentic hospital visit &amp; patient record.<br />
                Doctor: ${escapeHtml(latestDoctor)}<br />
                MRN: ${escapeHtml(patient.mrn || "Pending")}
              </small>
            </div>`
          : `<div></div>`
      }
      ${stampHtml}
      <div class="sig-box">
        <div class="sig-line">${escapeHtml(latestDoctor)}</div>
        <small>Medical Officer / Authorized Signatory</small>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

  return openPrintWindow(html);
}
