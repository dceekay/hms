type StructuredClinicalNote = {
  chiefComplaint?: string;
  history?: string;
  examination?: string;
  diagnosis?: string;
  plan?: string;
  remarks?: string;
};

type CaptureExtractionResult = {
  provider: "gemini" | "none";
  rawText: string;
  structured: StructuredClinicalNote | null;
};

const CLINICAL_JSON_PROMPT = `You are a clinical medical scribe at a Nigerian hospital.
Extract all clinical information and return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "rawText": "full verbatim transcription/OCR text",
  "structured": {
    "chiefComplaint": "main complaint or reason for visit (max 450 chars)",
    "history": "history of presenting illness / medical history (max 900 chars)",
    "examination": "vital signs and physical examination findings (max 900 chars)",
    "diagnosis": "working diagnosis or impression (max 450 chars)",
    "plan": "treatment, prescriptions, lab tests, or follow-up plan (max 900 chars)",
    "remarks": "any additional doctor notes or observations (max 900 chars)"
  }
}
Leave fields as empty strings "" if not mentioned.`;

function stripDataUrlPrefix(dataUrl: string, fallbackMime: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: fallbackMime, base64: dataUrl };
}

function parseGeminiJson(text: string): { rawText: string; structured: StructuredClinicalNote | null } {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      rawText?: string;
      structured?: StructuredClinicalNote;
    };
    return {
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : cleaned,
      structured: parsed.structured ?? null,
    };
  } catch {
    return {
      rawText: text.trim(),
      structured: null,
    };
  }
}

async function callGeminiMultimodal(
  dataUrl: string,
  fallbackMime: string,
  instruction: string
): Promise<CaptureExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { provider: "none", rawText: "", structured: null };
  }

  const { mimeType, base64 } = stripDataUrlPrefix(dataUrl, fallbackMime);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${CLINICAL_JSON_PROMPT}\n\nTask: ${instruction}` },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    return { provider: "gemini", rawText: "", structured: null };
  }

  const parsed = parseGeminiJson(text);
  return {
    provider: "gemini",
    rawText: parsed.rawText,
    structured: parsed.structured,
  };
}

export async function extractOcrFromNoteImage(
  imageDataUrl: string,
  mimeType = "image/webp"
): Promise<CaptureExtractionResult> {
  return callGeminiMultimodal(
    imageDataUrl,
    mimeType,
    "Perform accurate OCR on this handwritten or printed doctor's clinical note image, expanding standard medical shorthand clearly where obvious."
  );
}

export async function transcribeClinicalAudio(
  audioDataUrl: string,
  mimeType = "audio/webm"
): Promise<CaptureExtractionResult> {
  return callGeminiMultimodal(
    audioDataUrl,
    mimeType,
    "Transcribe this doctor's clinical voice dictation accurately (including Nigerian English pronunciation and medical/drug terms) and structure it."
  );
}

