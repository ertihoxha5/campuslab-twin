import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button.jsx";
import {
  laboratoryDefaultValues,
  laboratoryFormValues,
  laboratorySchema,
} from "@/validation/laboratory.js";

export function LaboratoryForm({
  initialValues = laboratoryDefaultValues,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(laboratorySchema),
    defaultValues: laboratoryFormValues(initialValues),
  });

  useEffect(() => {
    reset(laboratoryFormValues(initialValues));
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="laboratory-form-grid">
        <FormField
          label="Emri"
          error={errors.name?.message}
          input={<input {...register("name")} />}
        />
        <FormField
          label="Kodi"
          error={errors.code?.message}
          input={
            <input {...register("code")} placeholder="p.sh. LAB-KIMI-01" />
          }
        />
        <FormField
          label="Fakulteti"
          error={errors.faculty?.message}
          input={<input {...register("faculty")} />}
        />
        <FormField
          label="Ndërtesa"
          error={errors.building?.message}
          input={<input {...register("building")} />}
        />
        <FormField
          label="Kati"
          error={errors.floor?.message}
          input={<input {...register("floor")} />}
        />
        <FormField
          label="Kapaciteti"
          error={errors.capacity?.message}
          input={<input type="number" min="1" {...register("capacity")} />}
        />
        <FormField
          label="Statusi"
          error={errors.status?.message}
          input={
            <select {...register("status")}>
              <option value="active">Aktiv</option>
              <option value="inactive">Joaktiv</option>
              <option value="maintenance">Në mirëmbajtje</option>
            </select>
          }
        />
        <FormField
          className="laboratory-form-wide"
          label="Përshkrimi"
          error={errors.description?.message}
          input={<textarea rows="4" {...register("description")} />}
        />
      </div>
      <footer>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulo
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Po ruhet…" : submitLabel}
        </Button>
      </footer>
    </form>
  );
}

function FormField({ label, input, error, className = "" }) {
  return (
    <label className={className}>
      <span>{label}</span>
      {input}
      {error && <small>{error}</small>}
    </label>
  );
}
