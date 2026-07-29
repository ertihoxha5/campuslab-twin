import { useRef } from "react";
import { Box, Download, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

export function LaboratoryModelPanel({
  laboratoryId,
  model,
  canManage,
  uploading,
  onUpload,
  onRemove,
  onValidationError,
}) {
  const fileInput = useRef(null);

  function selectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (!["glb", "gltf"].includes(extension)) {
      onValidationError("Modeli duhet të jetë skedar GLB ose GLTF.");
      event.target.value = "";
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      onValidationError("Modeli 3D nuk mund të jetë më i madh se 25 MB.");
      event.target.value = "";
      return;
    }
    onUpload(file);
    event.target.value = "";
  }

  return (
    <section className="laboratory-model-panel">
      <div className="laboratory-model-icon">
        <Box size={22} />
      </div>
      <div className="laboratory-model-copy">
        <span>Modeli bazë 3D</span>
        {model ? (
          <>
            <strong>{model.originalName}</strong>
            <small>
              {formatFileSize(model.sizeBytes)} · GLB/GLTF tenant-safe
            </small>
          </>
        ) : (
          <>
            <strong>Nuk ka model të ngarkuar</strong>
            <small>
              Preview-i përdor zonat derisa të ngarkohet një model 3D.
            </small>
          </>
        )}
      </div>
      <div className="laboratory-model-actions">
        {model && (
          <Button asChild type="button" variant="outline" size="sm">
            <a href={`/api/laboratories/${laboratoryId}/model`}>
              <Download size={14} /> Shkarko
            </a>
          </Button>
        )}
        {canManage && (
          <>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              onChange={selectFile}
              aria-label="Zgjidh modelin 3D"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              <FileUp size={14} />
              {uploading
                ? "Po ngarkohet…"
                : model
                  ? "Zëvendëso"
                  : "Ngarko model"}
            </Button>
            {model && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                disabled={uploading}
              >
                <Trash2 size={14} /> Hiq
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function formatFileSize(value) {
  const bytes = Number(value ?? 0);
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("sq-AL", {
      maximumFractionDigits: 1,
    })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("sq-AL")} KB`;
}
