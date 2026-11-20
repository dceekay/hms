import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  FiCamera,
  FiCheck,
  FiEdit3,
  FiFileText,
  FiMic,
  FiMicOff,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import {
  transcribeClinicalVoiceNote,
  uploadClinicalNotePhoto,
} from "../../services/clinicalService";
import {
  appendNotePhotoTag,
  compressNotePhoto,
  parseClinicalNoteText,
  type StructuredClinicalFields,
} from "../../utils/clinicalNoteParser";

type CaptureMode = "form" | "photo" | "voice";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

type Props = {
  patientName: string;
  saving: boolean;
  onApplyStructured: (fields: Partial<StructuredClinicalFields>) => void;
  onQuickSaveStructured: (fields: Partial<StructuredClinicalFields>) => Promise<void>;
};

export function FieldMicButton({
  onTranscript,
  title = "Dictate into this field",
}: {
  onTranscript: (text: string) => void;
  title?: string;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) {
      window.alert("Voice dictation is supported in Chrome, Edge, or Android browsers.");
      return;
    }

    const rec = new SpeechCtor();
    rec.lang = "en-NG";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <button
      type="button"
      className={`doctor-field-mic ${listening ? "listening" : ""}`}
      onClick={toggle}
      title={listening ? "Stop dictating" : title}
      aria-label={title}
    >
      {listening ? <FiMicOff /> : <FiMic />}
      <span>{listening ? "Listening..." : "Speak"}</span>
    </button>
  );
}

export default function DoctorSmartNoteCapture({
  patientName,
  saving,
  onApplyStructured,
  onQuickSaveStructured,
}: Props) {
  const [mode, setMode] = useState<CaptureMode>("form");

  // Snapped Note Photo State (no OCR)
  const [notePreview, setNotePreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Voice State
  const [speechLang, setSpeechLang] = useState<"en-NG" | "en-GB" | "en-US">("en-NG");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [liveInterim, setLiveInterim] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [voiceEngine, setVoiceEngine] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const aiStructuredRef = useRef<Partial<StructuredClinicalFields> | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setStatusNote(null);
    setPhotoLoading(true);

    try {
      const dataUrl = await compressNotePhoto(file);
      setNotePreview(dataUrl);
      setStatusNote("Doctor's note photo ready! Click 'Save Photo as Doctor's Note' to store it.");
    } catch (err) {
      console.error(err);
      setPhotoError("Could not process that photo. Please try taking another picture.");
    } finally {
      setPhotoLoading(false);
      event.target.value = "";
    }
  };

  const handleAttachPhotoToForm = async () => {
    if (!notePreview) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const photoRef = await uploadClinicalNotePhoto(notePreview);
      const captionText = photoCaption.trim();
      onApplyStructured({
        chiefComplaint: captionText || undefined,
        remarks: appendNotePhotoTag(captionText, photoRef),
      });
      setNotePreview(null);
      setPhotoCaption("");
      setStatusNote("Note photo attached to consultation form!");
      setMode("form");
    } catch {
      setPhotoError("Unable to attach photo right now.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSavePhotoDirectly = async () => {
    if (!notePreview) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const photoRef = await uploadClinicalNotePhoto(notePreview);
      const captionText = photoCaption.trim();
      await onQuickSaveStructured({
        chiefComplaint: captionText || "Handwritten Doctor's Note (Photo)",
        remarks: appendNotePhotoTag(captionText, photoRef),
      });
      setNotePreview(null);
      setPhotoCaption("");
      setStatusNote("Doctor's note photo saved to consultation history!");
    } catch {
      setPhotoError("Unable to save photo right now.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const startVoiceDictation = async () => {
    setVoiceError(null);
    setStatusNote(null);
    aiStructuredRef.current = null;

    const SpeechCtor = getSpeechRecognitionConstructor();
    let startedAny = false;

    if (SpeechCtor) {
      try {
        const rec = new SpeechCtor();
        rec.lang = speechLang;
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event: any) => {
          let finalAddition = "";
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const chunk = event.results[i][0]?.transcript ?? "";
            if (event.results[i].isFinal) {
              finalAddition += `${chunk} `;
            } else {
              interim += chunk;
            }
          }
          if (finalAddition.trim()) {
            setVoiceText((prev) => `${prev ? `${prev.trim()} ` : ""}${finalAddition.trim()}`);
          }
          setLiveInterim(interim);
        };

        rec.onerror = (event: any) => {
          if (event?.error === "not-allowed") {
            setVoiceError("Microphone permission was blocked. Please allow mic access in your browser.");
          }
        };

        rec.onend = () => {
          setLiveInterim("");
        };

        recognitionRef.current = rec;
        rec.start();
        setVoiceEngine(`Live Speech (${speechLang})`);
        startedAny = true;
      } catch {
        // Fallback to MediaRecorder only
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (audioChunksRef.current.length === 0) return;
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          if (typeof navigator !== "undefined" && navigator.onLine && blob.size > 0 && blob.size < 8_000_000) {
            setTranscribingAudio(true);
            try {
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("Audio read failed"));
                reader.readAsDataURL(blob);
              });
              const aiAudio = await transcribeClinicalVoiceNote(dataUrl, blob.type || "audio/webm");
              if (aiAudio.provider === "gemini" && aiAudio.rawText) {
                setVoiceText(aiAudio.rawText);
                aiStructuredRef.current = aiAudio.structured;
                setVoiceEngine("Gemini Medical Speech AI");
                setStatusNote("Voice note transcribed and structured automatically!");
              }
            } finally {
              setTranscribingAudio(false);
            }
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        startedAny = true;
      } catch {
        if (!startedAny) {
          setVoiceError("Could not access microphone. Please check browser mic permissions.");
          return;
        }
      }
    }

    if (!startedAny) {
      setVoiceError("Voice dictation is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setIsRecording(true);
  };

  const stopVoiceDictation = () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setLiveInterim("");
  };

  const buildFieldsFromRaw = (raw: string): Partial<StructuredClinicalFields> => {
    if (aiStructuredRef.current) {
      return aiStructuredRef.current;
    }
    return parseClinicalNoteText(raw);
  };

  const applyToForm = (raw: string) => {
    const parsed = buildFieldsFromRaw(raw);
    onApplyStructured(parsed);
    setStatusNote("Fields filled! You can review them below or save right away.");
    setMode("form");
  };

  const saveDirectly = async (raw: string) => {
    const parsed = buildFieldsFromRaw(raw);
    if (!parsed.chiefComplaint && !parsed.diagnosis && !parsed.remarks) {
      parsed.remarks = raw.slice(0, 980);
    }
    await onQuickSaveStructured(parsed);
    setVoiceText("");
  };

  return (
    <div className="doctor-smart-capture">
      <div className="doctor-capture-tabs" role="tablist" aria-label="Doctor note entry mode">
        <button
          type="button"
          className={mode === "form" ? "active" : ""}
          onClick={() => setMode("form")}
        >
          <FiEdit3 />
          <span>Standard Form</span>
        </button>
        <button
          type="button"
          className={mode === "photo" ? "active" : ""}
          onClick={() => setMode("photo")}
        >
          <FiCamera />
          <span>Snap Note Photo</span>
        </button>
        <button
          type="button"
          className={mode === "voice" ? "active" : ""}
          onClick={() => setMode("voice")}
        >
          <FiMic />
          <span>Voice Dictation</span>
        </button>
      </div>

      {statusNote && <p className="doctor-capture-status">{statusNote}</p>}

      {mode === "photo" && (
        <div className="doctor-capture-panel">
          <div className="doctor-capture-head">
            <div>
              <strong>Snap &amp; Save Doctor&apos;s Note Photo</strong>
              <small>
                Take a photo of handwritten consultation notes for {patientName}. Saved directly as an image you can view anytime.
              </small>
            </div>
          </div>

          <div className="doctor-ocr-actions">
            <label className="doctor-snap-btn">
              <FiCamera />
              <span>Take Photo with Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelected}
                disabled={photoLoading || photoUploading}
              />
            </label>
            <label className="doctor-upload-btn">
              <FiUpload />
              <span>Upload Note Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                disabled={photoLoading || photoUploading}
              />
            </label>
          </div>

          {photoError && <p className="registration-error">{photoError}</p>}

          {notePreview && (
            <div className="doctor-ocr-result-grid">
              <div className="doctor-ocr-preview">
                <img src={notePreview} alt="Snapped doctor note" />
                <button
                  type="button"
                  className="icon-text-btn"
                  onClick={() => {
                    setNotePreview(null);
                    setPhotoCaption("");
                  }}
                >
                  <FiTrash2 />
                  Remove Photo
                </button>
              </div>

              <div className="doctor-ocr-editor">
                <label>
                  Optional Note Title / Summary
                  <textarea
                    rows={3}
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Optional quick summary (e.g. Malaria follow-up review)..."
                  />
                </label>

                <div className="doctor-capture-footer">
                  <button
                    type="button"
                    className="icon-text-btn"
                    onClick={() => void handleAttachPhotoToForm()}
                    disabled={photoUploading || saving}
                  >
                    <FiFileText />
                    Attach Photo to Form
                  </button>
                  <button
                    type="button"
                    className="icon-text-btn primary"
                    onClick={() => void handleSavePhotoDirectly()}
                    disabled={photoUploading || saving}
                  >
                    <FiSave />
                    {photoUploading || saving ? "Saving..." : "Save Photo as Doctor's Note"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "voice" && (
        <div className="doctor-capture-panel">
          <div className="doctor-capture-head">
            <div>
              <strong>Voice Dictation (Speech-to-Text)</strong>
              <small>
                Speak naturally for {patientName} (e.g. &quot;Chief complaint: high fever for 3 days.
                Diagnosis: Malaria. Plan: ACT tabs...&quot;).
              </small>
            </div>
            {voiceEngine && <span className="doctor-engine-pill">{voiceEngine}</span>}
          </div>

          <div className="doctor-voice-controls">
            <select
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value as "en-NG" | "en-GB" | "en-US")}
              disabled={isRecording}
              aria-label="Speech recognition accent"
            >
              <option value="en-NG">English (Nigeria)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
            </select>

            {!isRecording ? (
              <button
                type="button"
                className="doctor-mic-start"
                onClick={() => void startVoiceDictation()}
                disabled={transcribingAudio}
              >
                <FiMic />
                <span>Start Dictating</span>
              </button>
            ) : (
              <button
                type="button"
                className="doctor-mic-stop"
                onClick={stopVoiceDictation}
              >
                <FiMicOff />
                <span>Stop &amp; Process</span>
              </button>
            )}

            {transcribingAudio && (
              <span className="doctor-transcribing-badge">
                <FiRefreshCw className="spin" />
                Enhancing transcript...
              </span>
            )}
          </div>

          {voiceError && <p className="registration-error">{voiceError}</p>}

          {liveInterim && (
            <p className="doctor-interim-preview">
              <em>Listening:</em> {liveInterim}
            </p>
          )}

          <label>
            Dictated Clinical Note (editable)
            <textarea
              rows={5}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Tap 'Start Dictating' and speak your consultation notes..."
            />
          </label>

          <div className="doctor-capture-footer">
            <button
              type="button"
              className="icon-text-btn"
              onClick={() => setVoiceText("")}
              disabled={!voiceText.trim() || isRecording}
            >
              <FiTrash2 />
              Clear
            </button>
            <button
              type="button"
              className="icon-text-btn"
              onClick={() => applyToForm(voiceText)}
              disabled={!voiceText.trim() || isRecording || saving}
            >
              <FiCheck />
              Fill Form Fields
            </button>
            <button
              type="button"
              className="icon-text-btn primary"
              onClick={() => void saveDirectly(voiceText)}
              disabled={!voiceText.trim() || isRecording || saving}
            >
              <FiSave />
              {saving ? "Saving..." : "Save Dictated Visit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

