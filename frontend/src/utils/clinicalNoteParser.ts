export type StructuredClinicalFields = {
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  plan: string;
  remarks: string;
};

const SECTION_PATTERNS: Array<{
  field: keyof StructuredClinicalFields;
  regex: RegExp;
}> = [
  {
    field: "chiefComplaint",
    regex: /^(?:chief\s*complaint|presenting\s*complaint|complaint|c\/o|pc)\s*[:\-–]\s*(.+)$/i,
  },
  {
    field: "history",
    regex: /^(?:history(?:\s*of\s*presenting\s*illness)?|hpc|pmh|hx)\s*[:\-–]\s*(.+)$/i,
  },
  {
    field: "examination",
    regex: /^(?:examination|physical\s*exam(?:ination)?|o\/e|vitals?|findings)\s*[:\-–]\s*(.+)$/i,
  },
  {
    field: "diagnosis",
    regex: /^(?:diagnosis|working\s*diagnosis|impression|assessment|dx|imp)\s*[:\-–]\s*(.+)$/i,
  },
  {
    field: "plan",
    regex: /^(?:plan|treatment(?:\s*plan)?|management|prescription|meds|rx|investigations?)\s*[:\-–]\s*(.+)$/i,
  },
  {
    field: "remarks",
    regex: /^(?:remarks?|notes?|additional\s*notes?|follow[\s-]*up)\s*[:\-–]\s*(.+)$/i,
  },
];

export function parseClinicalNoteText(rawText: string): StructuredClinicalFields {
  const result: StructuredClinicalFields = {
    chiefComplaint: "",
    history: "",
    examination: "",
    diagnosis: "",
    plan: "",
    remarks: "",
  };

  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return result;

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentField: keyof StructuredClinicalFields | null = null;
  const unmapped: string[] = [];

  for (const line of lines) {
    let matched = false;
    for (const { field, regex } of SECTION_PATTERNS) {
      const m = line.match(regex);
      if (m) {
        currentField = field;
        const content = m[1]?.trim();
        if (content) {
          result[field] = result[field] ? `${result[field]}\n${content}` : content;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (currentField) {
        result[currentField] = result[currentField]
          ? `${result[currentField]}\n${line}`
          : line;
      } else {
        unmapped.push(line);
      }
    }
  }

  if (unmapped.length > 0) {
    const joined = unmapped.join("\n");
    if (!result.chiefComplaint && unmapped[0].length <= 160) {
      result.chiefComplaint = unmapped[0];
      const rest = unmapped.slice(1).join("\n").trim();
      if (rest) {
        result.remarks = result.remarks ? `${result.remarks}\n${rest}` : rest;
      }
    } else {
      result.remarks = result.remarks ? `${result.remarks}\n${joined}` : joined;
    }
  }

  // Trim to backend max lengths
  result.chiefComplaint = result.chiefComplaint.slice(0, 480);
  result.history = result.history.slice(0, 980);
  result.examination = result.examination.slice(0, 980);
  result.diagnosis = result.diagnosis.slice(0, 480);
  result.plan = result.plan.slice(0, 980);
  result.remarks = result.remarks.slice(0, 980);

  return result;
}

export async function prepareNoteImageForOcr(file: File): Promise<{
  ocrDataUrl: string;
  previewDataUrl: string;
}> {
  const bitmap = await createImageBitmap(file);

  // Higher resolution for OCR clarity
  const ocrMax = 1600;
  const ocrScale = Math.min(1, ocrMax / Math.max(bitmap.width, bitmap.height));
  const ocrW = Math.max(1, Math.round(bitmap.width * ocrScale));
  const ocrH = Math.max(1, Math.round(bitmap.height * ocrScale));

  const ocrCanvas = document.createElement("canvas");
  ocrCanvas.width = ocrW;
  ocrCanvas.height = ocrH;
  const ocrCtx = ocrCanvas.getContext("2d");
  if (!ocrCtx) {
    bitmap.close();
    throw new Error("Unable to initialize image canvas.");
  }

  ocrCtx.filter = "contrast(1.22) grayscale(0.35)";
  ocrCtx.drawImage(bitmap, 0, 0, ocrW, ocrH);
  const ocrDataUrl = ocrCanvas.toDataURL("image/webp", 0.88);

  // Compact preview for local attachment cache
  const prevMax = 720;
  const prevScale = Math.min(1, prevMax / Math.max(bitmap.width, bitmap.height));
  const prevW = Math.max(1, Math.round(bitmap.width * prevScale));
  const prevH = Math.max(1, Math.round(bitmap.height * prevScale));
  const prevCanvas = document.createElement("canvas");
  prevCanvas.width = prevW;
  prevCanvas.height = prevH;
  const prevCtx = prevCanvas.getContext("2d");
  if (prevCtx) {
    prevCtx.drawImage(bitmap, 0, 0, prevW, prevH);
  }
  const previewDataUrl = prevCanvas.toDataURL("image/webp", 0.72);

  bitmap.close();
  return { ocrDataUrl, previewDataUrl };
}

const LOCAL_NOTE_PHOTOS_KEY = "hms_note_photos_v1";

function getApiOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) || "";
  if (!raw) return "";
  try {
    return new URL(raw, window.location.origin).origin;
  } catch {
    return "";
  }
}

export async function compressNotePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Unable to initialize image canvas.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  bitmap.close();
  return dataUrl;
}

export function storeLocalNotePhoto(dataUrl: string): string {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    const raw = localStorage.getItem(LOCAL_NOTE_PHOTOS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[id] = dataUrl;
    localStorage.setItem(LOCAL_NOTE_PHOTOS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
  return `local://${id}`;
}

export function resolveNotePhotoUrl(ref: string): string {
  if (ref.startsWith("local://")) {
    const id = ref.slice("local://".length);
    try {
      const raw = localStorage.getItem(LOCAL_NOTE_PHOTOS_KEY);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      return map[id] || "";
    } catch {
      return "";
    }
  }
  if (ref.startsWith("/uploads/")) {
    const origin = getApiOrigin();
    return origin ? `${origin}${ref}` : ref;
  }
  return ref;
}

export function appendNotePhotoTag(remarks: string, photoRef: string): string {
  const tag = `[NOTE_PHOTO:${photoRef}]`;
  const trimmed = remarks.trim();
  if (!trimmed) return tag;
  if (trimmed.includes(tag)) return trimmed;
  return `${trimmed}\n${tag}`.slice(0, 990);
}

export function extractNotePhotos(text?: string | null): {
  cleanText: string;
  photoUrls: string[];
} {
  if (!text) return { cleanText: "", photoUrls: [] };
  const photoUrls: string[] = [];
  const cleanText = text
    .replace(/\[NOTE_PHOTO:([^\]]+)\]/g, (_match, ref: string) => {
      const resolved = resolveNotePhotoUrl(ref.trim());
      if (resolved) photoUrls.push(resolved);
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, photoUrls };
}


