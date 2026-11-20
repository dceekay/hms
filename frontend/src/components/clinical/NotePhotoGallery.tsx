import { useState } from "react";
import { FiCamera, FiExternalLink, FiX } from "react-icons/fi";
import { extractNotePhotos } from "../../utils/clinicalNoteParser";

interface NotePhotoGalleryProps {
  text?: string | null;
  label?: string;
}

export default function NotePhotoGallery({
  text,
  label = "Snapped Doctor Note",
}: NotePhotoGalleryProps) {
  const { photoUrls } = extractNotePhotos(text);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  if (photoUrls.length === 0) return null;

  return (
    <>
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {photoUrls.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => setActiveUrl(url)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px 4px 4px",
              borderRadius: "10px",
              border: "1px solid var(--readable-border, #cbd5e1)",
              background: "var(--readable-surface-soft, #f8fafc)",
              color: "var(--readable-strong, #0f172a)",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
            title="Click to view full snapped doctor note"
          >
            <img
              src={url}
              alt={`${label} ${idx + 1}`}
              style={{
                width: "34px",
                height: "34px",
                objectFit: "cover",
                borderRadius: "6px",
              }}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <FiCamera size={13} />
              View {label} {photoUrls.length > 1 ? `#${idx + 1}` : ""}
            </span>
          </button>
        ))}
      </div>

      {activeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setActiveUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2, 6, 23, 0.84)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(92vw, 900px)",
              maxHeight: "88vh",
              background: "#0f172a",
              borderRadius: "14px",
              padding: "12px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>{label}</strong>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#38bdf8",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  <FiExternalLink size={14} /> Open Full Tab
                </a>
                <button
                  type="button"
                  onClick={() => setActiveUrl(null)}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 700,
                  }}
                >
                  <FiX size={16} /> Close
                </button>
              </div>
            </div>
            <img
              src={activeUrl}
              alt={label}
              style={{
                maxWidth: "100%",
                maxHeight: "76vh",
                objectFit: "contain",
                borderRadius: "8px",
                background: "#020617",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
