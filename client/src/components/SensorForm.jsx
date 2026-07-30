import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button.jsx";
import {
  sensorDefaultValues,
  sensorSchema,
  sensorTypes,
} from "@/validation/sensor.js";

export function SensorForm({
  options,
  loadingOptions,
  saving,
  onLaboratoryChange,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sensorSchema),
    defaultValues: sensorDefaultValues,
  });
  const laboratoryId = watch("laboratoryId");
  const sensorType = watch("sensorType");

  useEffect(() => {
    onLaboratoryChange(laboratoryId);
  }, [laboratoryId, onLaboratoryChange]);

  useEffect(() => {
    setValue("unit", sensorTypes[sensorType].unit, { shouldValidate: true });
  }, [sensorType, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sensor-form-sections">
        <FormSection title="Identifikimi dhe lidhja">
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
            label="Pajisja"
            input={
              <select {...register("equipmentId")} disabled={!laboratoryId}>
                <option value="">Pa pajisje të lidhur</option>
                {options.equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
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
            input={<input {...register("code")} placeholder="p.sh. TEMP-01" />}
          />
          <Field
            label="Lloji"
            input={
              <select {...register("sensorType")}>
                {Object.entries(sensorTypes).map(([value, definition]) => (
                  <option key={value} value={value}>
                    {definition.label}
                  </option>
                ))}
              </select>
            }
          />
          <Field
            label="Njësia"
            error={errors.unit?.message}
            input={<input {...register("unit")} readOnly />}
          />
          <Field
            label="Statusi"
            input={
              <select {...register("status")}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="calibration">Në kalibrim</option>
                <option value="inactive">Joaktiv</option>
              </select>
            }
          />
          <Field
            label="Intervali i mostrimit (sekonda)"
            error={errors.samplingIntervalSeconds?.message}
            input={
              <input
                type="number"
                min="1"
                max="86400"
                {...register("samplingIntervalSeconds")}
              />
            }
          />
        </FormSection>

        <FormSection title="Pragjet">
          <NumberField
            label="Minimumi paralajmërues"
            name="warningMin"
            register={register}
            error={errors.warningMin?.message}
          />
          <NumberField
            label="Maksimumi paralajmërues"
            name="warningMax"
            register={register}
            error={errors.warningMax?.message}
          />
          <NumberField
            label="Minimumi kritik"
            name="criticalMin"
            register={register}
            error={errors.criticalMin?.message}
          />
          <NumberField
            label="Maksimumi kritik"
            name="criticalMax"
            register={register}
            error={errors.criticalMax?.message}
          />
        </FormSection>

        <FormSection title="Kalibrimi">
          <Field
            label="Kalibrimi i fundit"
            input={
              <input type="datetime-local" {...register("calibratedAt")} />
            }
          />
          <Field
            label="Kalibrimi i ardhshëm"
            error={errors.calibrationDueAt?.message}
            input={
              <input type="datetime-local" {...register("calibrationDueAt")} />
            }
          />
        </FormSection>

        <FormSection title="Vendosja në modelin 3D">
          {["X", "Y", "Z"].map((axis) => (
            <NumberField
              key={`position${axis}`}
              label={`Pozicioni ${axis}`}
              name={`position${axis}`}
              register={register}
              error={errors[`position${axis}`]?.message}
            />
          ))}
          {["X", "Y", "Z"].map((axis) => (
            <NumberField
              key={`rotation${axis}`}
              label={`Rotacioni ${axis} (°)`}
              name={`rotation${axis}`}
              register={register}
              error={errors[`rotation${axis}`]?.message}
            />
          ))}
        </FormSection>
      </div>
      <footer>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulo
        </Button>
        <Button type="submit" disabled={saving || loadingOptions}>
          {saving ? "Po ruhet…" : "Krijo sensorin"}
        </Button>
      </footer>
    </form>
  );
}

function FormSection({ title, children }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="equipment-form-grid">{children}</div>
    </fieldset>
  );
}

function NumberField({ label, name, register, error }) {
  return (
    <Field
      label={label}
      error={error}
      input={<input type="number" step="any" {...register(name)} />}
    />
  );
}

function Field({ label, input, error }) {
  return (
    <label>
      <span>{label}</span>
      {input}
      {error && <small>{error}</small>}
    </label>
  );
}
