import { useEffect, useRef, useState } from "react";
import { uiDateToGedcom, gedcomDateToUi } from "@/utils/date";
import type { PendingRelationType } from "@/types/domain";
import type { GeneaDocument } from "@/types/domain";
import type { PersonEditorPatch, PersonEditorState, PersonRelationInput } from "@/types/editor";
import type { AiSettings } from "@/types/ai";
import { BirthRangeRefinementCard } from "@/ui/person/BirthRangeRefinementCard";

type Props = {
  editorState: PersonEditorState;
  document: GeneaDocument | null;
  aiSettings: AiSettings;
  onClose: () => void;
  onSaveEdit: (personId: string, patch: PersonEditorPatch) => void;
  onSaveRelation: (anchorId: string, type: PendingRelationType, input: PersonRelationInput) => void;
  onCreateStandalone?: (input: PersonRelationInput) => void;
};

const CROP_VIEW_W = 220;
const CROP_VIEW_H = 300;
const SUPPORTED_IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "tif", "tiff", "ico", "heic", "heif"];

function isImageFile(file: File): boolean {
  if (file.type?.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_IMAGE_EXT.includes(ext);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}

export function PersonEditorPanel({ editorState, document, aiSettings, onClose, onSaveEdit, onSaveRelation, onCreateStandalone }: Props) {
  const [name, setName] = useState("");
  const [paternalSurname, setPaternalSurname] = useState("");
  const [maternalSurname, setMaternalSurname] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "U">("U");
  const [lifeStatus, setLifeStatus] = useState<"alive" | "deceased">("alive");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoSourceDataUrl, setPhotoSourceDataUrl] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [isDragOverPhoto, setIsDragOverPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [imgDim, setImgDim] = useState({ w: 0, h: 0 });
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [relationType, setRelationType] = useState<PendingRelationType>("child");
  const [pendingNotesAppend, setPendingNotesAppend] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!editorState) return;

    if (editorState.type === "edit") {
      const p = editorState.person;
      const birtEvent = p.events.find((e) => e.type === "BIRT");
      const deatEvent = p.events.find((e) => e.type === "DEAT");

      setName(p.name === "(Sin nombre)" ? "" : p.name);
      const parts = (p.surname || "").split(" ").filter(Boolean);
      setPaternalSurname(parts[0] || "");
      setMaternalSurname(parts.slice(1).join(" ") || "");
      setSex(p.sex || "U");
      setLifeStatus(p.lifeStatus === "deceased" || deatEvent ? "deceased" : "alive");
      setBirthDate(gedcomDateToUi(birtEvent?.date));
      setDeathDate(gedcomDateToUi(deatEvent?.date));

      const mId = p.mediaRefs?.[0];
      const currentPhoto = (mId && document?.media?.[mId]) ? (document.media[mId].dataUrl || document.media[mId].fileName || mId) : null;
      setPhotoDataUrl(currentPhoto);
      setPhotoSourceDataUrl(currentPhoto);
      setInitialPhotoUrl(currentPhoto);
    } else {
      setName("");
      setPaternalSurname("");
      setMaternalSurname("");
      setSex("U");
      setLifeStatus("alive");
      setBirthDate("");
      setDeathDate("");
      setPhotoDataUrl(null);
      setPhotoSourceDataUrl(null);
      setInitialPhotoUrl(null);
    }

    if (editorState.type === "add_relation") {
      setRelationType(editorState.relationType);
    }

    setPhotoZoom(1);
    setPhotoOffset({ x: 0, y: 0 });
    setImgDim({ w: 0, h: 0 });
    setFormError("");
    setPendingNotesAppend([]);
  }, [editorState, document]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingPhoto || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPhotoOffset({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy
      });
    }

    function onUp() {
      setIsDraggingPhoto(false);
      dragStartRef.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDraggingPhoto]);

  if (!editorState) return null;
  async function applyPhotoFile(file: File) {
    if (!isImageFile(file)) {
      setFormError("Archivo no compatible. Usa una imagen valida.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhotoSourceDataUrl(dataUrl);
      setPhotoDataUrl(dataUrl);
      setPhotoZoom(1);
      setPhotoOffset({ x: 0, y: 0 });
      setFormError("");
    } catch {
      setFormError("No se pudo cargar la imagen.");
    }
  }

  async function buildCroppedImage(source: string): Promise<string> {
    const img = await loadImage(source);
    const exportScale = 2;
    const canvas = window.document.createElement("canvas");
    const cw = CROP_VIEW_W * exportScale;
    const ch = CROP_VIEW_H * exportScale;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear canvas.");

    const baseScale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const scale = baseScale * photoZoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const centerX = cw / 2 + photoOffset.x * exportScale;
    const centerY = ch / 2 + photoOffset.y * exportScale;
    const dx = centerX - drawW / 2;
    const dy = centerY - drawH / 2;

    ctx.drawImage(img, dx, dy, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function handleSave() {
    if (!editorState) return;
    if (!name.trim()) {
      setFormError("Los nombres son obligatorios.");
      return;
    }
    if (!paternalSurname.trim()) {
      setFormError("El apellido paterno es obligatorio.");
      return;
    }

    const n = name.trim();
    const p = paternalSurname.trim();
    const m = maternalSurname.trim();
    const fullSurname = m ? `${p} ${m}` : p;
    const bDateGed = uiDateToGedcom(birthDate);
    const dDateGed = lifeStatus === "deceased" ? uiDateToGedcom(deathDate) : "";

    let finalPhoto: string | null | undefined = undefined;
    if (photoDataUrl === null) {
      finalPhoto = null;
    } else if (photoSourceDataUrl !== initialPhotoUrl || photoZoom !== 1 || photoOffset.x !== 0 || photoOffset.y !== 0) {
      if (photoSourceDataUrl) {
        try {
          finalPhoto = await buildCroppedImage(photoSourceDataUrl);
        } catch {
          setFormError("No se pudo aplicar el recorte, se mantuvo la foto actual.");
          finalPhoto = photoDataUrl;
        }
      }
    }

    const payload: PersonRelationInput = {
      name: n,
      surname: fullSurname,
      sex,
      birthDate: bDateGed,
      deathDate: dDateGed,
      lifeStatus,
      ...(finalPhoto !== undefined && { photoDataUrl: finalPhoto }),
      ...(editorState.type === "edit" && pendingNotesAppend.length > 0 ? { notesAppend: pendingNotesAppend } : {})
    };

    if (editorState.type === "edit") onSaveEdit(editorState.personId, payload);
    else if (editorState.type === "add_relation") onSaveRelation(editorState.anchorId, relationType, payload);
    else onCreateStandalone?.(payload);

    onClose();
  }

  const title = editorState.type === "edit" ? "Edición rápida" : editorState.type === "create_standalone" ? "Crear Persona nueva" : "Agregar familiar";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body modal-body--tight">
        <div className="builder" style={{ marginTop: 0 }}>
          {formError && <div className="inline-error">{formError}</div>}

          {editorState.type === "add_relation" && (
            <label>
              Parentesco que se va a crear *
              <select value={relationType} onChange={(e) => setRelationType(e.target.value as PendingRelationType)}>
                <option value="father">Padre</option>
                <option value="mother">Madre</option>
                <option value="spouse">Pareja / Esposo(a)</option>
                <option value="child">Hijo(a)</option>
                <option value="sibling">Hermano(a)</option>
              </select>
            </label>
          )}

          <label>
            Name(s) (nombres) *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Carlos" />
          </label>

          <label>
            Paternal surname (apellido paterno) *
            <input value={paternalSurname} onChange={(e) => setPaternalSurname(e.target.value)} placeholder="Ej: Perez" />
          </label>

          <label>
            Maternal surname (apellido materno)
            <input value={maternalSurname} onChange={(e) => setMaternalSurname(e.target.value)} placeholder="Ej: Lopez (opcional)" />
          </label>

          <label>
            Sex/Gender *
            <select value={sex} onChange={(e) => setSex(e.target.value as "M" | "F" | "U")}>
              <option value="M">Hombre</option>
              <option value="F">Mujer</option>
              <option value="U">Desconocido</option>
            </select>
          </label>

          <label>
            Birth date (nacimiento)
            <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
          </label>

          {editorState.type === "edit" && document ? (
            <BirthRangeRefinementCard
              document={document}
              personId={editorState.personId}
              aiSettings={aiSettings}
              onApplyBirthGedcom={setBirthDate}
              onAppendNote={(note) => setPendingNotesAppend((prev) => [...prev, note])}
            />
          ) : null}
          <label>
            Living status
            <select value={lifeStatus} onChange={(e) => setLifeStatus(e.target.value as "alive" | "deceased")}>
              <option value="alive">Vivo</option>
              <option value="deceased">Fallecido</option>
            </select>
          </label>

          {lifeStatus === "deceased" ? (
            <label>
              Death date (defuncion)
              <input value={deathDate} onChange={(e) => setDeathDate(e.target.value)} placeholder="dd/mm/aaaa, mm/aaaa o aaaa" />
            </label>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10, fontWeight: 500, fontSize: 13, color: "var(--ink-muted)" }}>
            <span style={{ color: "var(--ink-1)", marginBottom: 4 }}>Foto</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void applyPhotoFile(file);
                e.target.value = "";
              }}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverPhoto(true);
              }}
              onDragLeave={() => setIsDragOverPhoto(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverPhoto(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void applyPhotoFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${isDragOverPhoto ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 10,
                padding: "10px 12px",
                background: isDragOverPhoto ? "var(--accent-soft)" : "transparent",
                cursor: "pointer",
                marginBottom: 8
              }}
              title="Haz clic o arrastra una imagen aqui"
            >
              {photoSourceDataUrl ? "Cambiar imagen" : "Haz clic o arrastra una imagen aqui"}
            </div>

            {photoSourceDataUrl ? (
              <>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Encuadre (arrastra para mover, usa zoom):</div>
                <div
                  onMouseDown={(e) => {
                    setIsDraggingPhoto(true);
                    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: photoOffset.x, oy: photoOffset.y };
                  }}
                  style={{
                    width: CROP_VIEW_W,
                    height: CROP_VIEW_H,
                    margin: "0 auto 8px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    overflow: "hidden",
                    position: "relative",
                    background: "var(--bg-input)",
                    cursor: isDraggingPhoto ? "grabbing" : "grab",
                    touchAction: "none"
                  }}
                >
                  <img
                    src={photoSourceDataUrl}
                    alt="preview"
                    draggable={false}
                    onLoad={(e) => setImgDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: imgDim.w ? imgDim.w * Math.max(CROP_VIEW_W / imgDim.w, CROP_VIEW_H / imgDim.h) * photoZoom : "100%",
                      height: imgDim.h ? imgDim.h * Math.max(CROP_VIEW_W / imgDim.w, CROP_VIEW_H / imgDim.h) * photoZoom : "100%",
                      objectFit: imgDim.w ? "fill" : "cover",
                      transform: `translate(calc(-50% + ${photoOffset.x}px), calc(-50% + ${photoOffset.y}px))`,
                      transformOrigin: "center center",
                      userSelect: "none",
                      pointerEvents: "none"
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12 }}>Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={photoZoom}
                    onChange={(e) => setPhotoZoom(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => setPhotoOffset({ x: 0, y: 0 })} style={{ width: "auto", padding: "0 10px" }}>
                    Centrar
                  </button>
                  <button
                    type="button"
                    className="danger"
                    style={{ width: "auto", padding: "0 10px" }}
                    onClick={() => {
                      setPhotoDataUrl(null);
                      setPhotoSourceDataUrl(null);
                      setPhotoZoom(1);
                      setPhotoOffset({ x: 0, y: 0 });
                    }}
                  >
                    Quitar
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <button onClick={() => void handleSave()} style={{ marginTop: 16 }}>
            Guardar
          </button>
        </div>
        </div>
      </div>
    </div >
  );
}


