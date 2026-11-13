import { HOSPITAL_OFFICIAL_DETAILS } from "../constants/hospitalInfo";
import type { Patient } from "../types/patient";

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

export function printManualDoctorVisitSlip(options: {
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
      max-width: 780px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      border-radius: 10px;
      padding: 20px 24px;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #0f172a;
    }
    .header p {
      margin: 2px 0;
      font-size: 12px;
      color: #475569;
    }
    .stamp {
      border: 2px solid #0284c7;
      color: #0284c7;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: center;
      transform: rotate(-3deg);
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
      gap: 20px;
      padding-top: 8px;
    }
    .line {
      border-bottom: 1px dashed #cbd5e1;
      height: 16px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 12px;
    }
    .sig {
      width: 220px;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      text-align: center;
      font-weight: 600;
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
      <div>
        <h1>${escapeHtml(hospital.name)}</h1>
        <p>${escapeHtml(hospital.shortAddress)}</p>
        <p>${escapeHtml(hospital.displayPhone)} • ${escapeHtml(hospital.email)}</p>
      </div>
      <div class="stamp">
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
      <h3>Doctor's History, Findings & Diagnosis</h3>
      ${notes ? `<p style="margin:0 0 8px;font-size:12px;color:#334155;"><strong>Front Desk Note:</strong> ${escapeHtml(notes)}</p>` : ""}
      <div class="lines">
        <div class="line"></div>
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
        <div class="line"></div>
      </div>
    </div>

    <div class="footer">
      <div>Printed from ${escapeHtml(hospital.name)} • File in Patient Folder after visit</div>
      <div class="sig">Doctor's Signature & Stamp</div>
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

  const printWindow = window.open("", "_blank", "width=880,height=920");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
