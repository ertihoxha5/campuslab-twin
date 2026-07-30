import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button.jsx";
import {
  equipmentDefaultValues,
  equipmentFormValues,
  equipmentSchema,
} from "@/validation/equipment.js";

export function EquipmentForm({
  options,
  loadingOptions,
  saving,
  onLaboratoryChange,
  onSubmit,
  onCancel,
  initialValues = equipmentDefaultValues,
  submitLabel = "Krijo pajisjen",
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: equipmentFormValues(initialValues),
  });
  const laboratoryId = watch("laboratoryId");

  useEffect(() => {
    onLaboratoryChange(laboratoryId);
  }, [laboratoryId, onLaboratoryChange]);

  useEffect(() => {
    reset(equipmentFormValues(initialValues));
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="equipment-form-grid">
        <Field
          label="Laboratori"
          error={errors.laboratoryId?.message}
          input={
            <select {...register("laboratoryId")} disabled={loadingOptions}>
              <option value="">Zgjidh laboratorin</option>
              {options.laboratories.map((laboratory) => (
                <option key={laboratory.id} value={laboratory.id}>
                  {laboratory.name} ({laboratory.code})
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="Zona"
          error={errors.zoneId?.message}
          input={
            <select {...register("zoneId")} disabled={!laboratoryId}>
              <option value="">Pa zonë të caktuar</option>
              {options.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.code})
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="Emri"
          error={errors.name?.message}
          input={<input {...register("name")} />}
        />
        <Field
          label="Kodi"
          error={errors.code?.message}
          input={<input {...register("code")} placeholder="p.sh. ROB-01" />}
        />
        <Field
          label="Lloji"
          error={errors.type?.message}
          input={<input {...register("type")} placeholder="p.sh. Robotikë" />}
        />
        <Field
          label="Statusi"
          error={errors.status?.message}
          input={
            <select {...register("status")}>
              <option value="active">Aktive</option>
              <option value="inactive">Joaktive</option>
              <option value="fault">Me defekt</option>
              <option value="maintenance">Në mirëmbajtje</option>
            </select>
          }
        />
        <Field
          label="Prodhuesi"
          input={<input {...register("manufacturer")} />}
        />
        <Field label="Modeli" input={<input {...register("model")} />} />
        <Field
          label="Numri serik"
          input={<input {...register("serialNumber")} />}
        />
        <Field
          label="Përgjegjësi"
          input={
            <select {...register("responsibleUserId")}>
              <option value="">Pa përgjegjës</option>
              {options.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                  {user.jobTitle ? ` — ${user.jobTitle}` : ""}
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="Data e blerjes"
          input={<input type="date" {...register("purchaseDate")} />}
        />
        <Field
          label="Garancia deri më"
          input={<input type="date" {...register("warrantyExpiresAt")} />}
        />
        <Field
          label="Fuqia e vlerësuar (W)"
          error={errors.energyRatingWatts?.message}
          input={
            <input type="number" min="0" {...register("energyRatingWatts")} />
          }
        />
        <Field
          label="Shëndeti (%)"
          error={errors.healthScore?.message}
          input={
            <input
              type="number"
              min="0"
              max="100"
              {...register("healthScore")}
            />
          }
        />
        <Field
          className="equipment-form-wide"
          label="Referenca e objektit 3D"
          input={
            <input
              {...register("object3dReference")}
              placeholder="p.sh. robot-industrial.glb"
            />
          }
        />
      </div>
      <footer>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulo
        </Button>
        <Button type="submit" disabled={saving || loadingOptions}>
          {saving ? "Po ruhet…" : submitLabel}
        </Button>
      </footer>
    </form>
  );
}

function Field({ label, input, error, className = "" }) {
  return (
    <label className={className}>
      <span>{label}</span>
      {input}
      {error && <small>{error}</small>}
    </label>
  );
}
