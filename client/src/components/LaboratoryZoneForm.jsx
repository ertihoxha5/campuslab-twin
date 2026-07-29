import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.jsx";

const zoneFormSchema = z
  .object({
    name: z.string().trim().min(2, "Shkruani emrin e zonës."),
    code: z
      .string()
      .trim()
      .min(2, "Shkruani kodin e zonës.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Kodi mund të përmbajë vetëm shkronja, numra, - dhe _.",
      ),
    zoneType: z.enum([
      "general",
      "teaching",
      "research",
      "preparation",
      "storage",
      "safety",
    ]),
    occupancyLimit: z.coerce.number().int().positive(),
    positionX: z.coerce.number().finite(),
    positionY: z.coerce.number().finite(),
    positionZ: z.coerce.number().finite(),
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    depth: z.coerce.number().positive(),
    temperatureMin: z.coerce.number().finite(),
    temperatureMax: z.coerce.number().finite(),
    humidityMin: z.coerce.number().finite(),
    humidityMax: z.coerce.number().finite(),
    co2Min: z.coerce.number().finite(),
    co2Max: z.coerce.number().finite(),
    description: z.string().trim().max(5000).optional(),
  })
  .superRefine((values, context) => {
    for (const [minimum, maximum, path] of [
      [values.temperatureMin, values.temperatureMax, "temperatureMax"],
      [values.humidityMin, values.humidityMax, "humidityMax"],
      [values.co2Min, values.co2Max, "co2Max"],
    ]) {
      if (minimum >= maximum) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Vlera maksimale duhet të jetë më e madhe.",
        });
      }
    }
  });

const defaults = {
  name: "",
  code: "",
  zoneType: "general",
  occupancyLimit: 20,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  width: 6,
  height: 3,
  depth: 6,
  temperatureMin: 18,
  temperatureMax: 26,
  humidityMin: 30,
  humidityMax: 70,
  co2Min: 350,
  co2Max: 1000,
  description: "",
};

export function LaboratoryZoneForm({
  initialZone,
  onSubmit,
  onCancel,
  saving,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: zoneFormValues(initialZone),
  });

  useEffect(() => {
    reset(zoneFormValues(initialZone));
  }, [initialZone, reset]);

  function submit(values) {
    return onSubmit({
      name: values.name,
      code: values.code,
      zoneType: values.zoneType,
      occupancyLimit: values.occupancyLimit,
      position: {
        x: values.positionX,
        y: values.positionY,
        z: values.positionZ,
      },
      dimensions: {
        width: values.width,
        height: values.height,
        depth: values.depth,
      },
      environmentalThresholds: {
        temperature: {
          min: values.temperatureMin,
          max: values.temperatureMax,
        },
        humidity: { min: values.humidityMin, max: values.humidityMax },
        co2: { min: values.co2Min, max: values.co2Max },
      },
      description: values.description ?? "",
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="zone-form-grid">
        <Field
          label="Emri i zonës"
          error={errors.name?.message}
          input={<input {...register("name")} />}
        />
        <Field
          label="Kodi"
          error={errors.code?.message}
          input={<input {...register("code")} placeholder="p.sh. ZONA-A" />}
        />
        <Field
          label="Lloji"
          input={
            <select {...register("zoneType")}>
              <option value="general">E përgjithshme</option>
              <option value="teaching">Mësim</option>
              <option value="research">Kërkim</option>
              <option value="preparation">Përgatitje</option>
              <option value="storage">Depo</option>
              <option value="safety">Siguri</option>
            </select>
          }
        />
        <Field
          label="Kufiri i personave"
          input={
            <input type="number" min="1" {...register("occupancyLimit")} />
          }
        />

        <fieldset>
          <legend>Pozicioni 3D</legend>
          <div>
            <NumberField label="X" registration={register("positionX")} />
            <NumberField label="Y" registration={register("positionY")} />
            <NumberField label="Z" registration={register("positionZ")} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Dimensionet në metra</legend>
          <div>
            <NumberField
              label="Gjerësia"
              min="0.1"
              registration={register("width")}
            />
            <NumberField
              label="Lartësia"
              min="0.1"
              registration={register("height")}
            />
            <NumberField
              label="Thellësia"
              min="0.1"
              registration={register("depth")}
            />
          </div>
        </fieldset>

        <fieldset className="zone-form-wide">
          <legend>Pragjet mjedisore</legend>
          <div className="zone-threshold-grid">
            <NumberField
              label="Temperatura min. °C"
              registration={register("temperatureMin")}
            />
            <NumberField
              label="Temperatura maks. °C"
              error={errors.temperatureMax?.message}
              registration={register("temperatureMax")}
            />
            <NumberField
              label="Lagështia min. %"
              registration={register("humidityMin")}
            />
            <NumberField
              label="Lagështia maks. %"
              error={errors.humidityMax?.message}
              registration={register("humidityMax")}
            />
            <NumberField
              label="CO₂ min. ppm"
              registration={register("co2Min")}
            />
            <NumberField
              label="CO₂ maks. ppm"
              error={errors.co2Max?.message}
              registration={register("co2Max")}
            />
          </div>
        </fieldset>

        <Field
          className="zone-form-wide"
          label="Përshkrimi"
          input={<textarea rows="3" {...register("description")} />}
        />
      </div>
      <footer>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulo
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Po ruhet…" : initialZone ? "Ruaj zonën" : "Krijo zonën"}
        </Button>
      </footer>
    </form>
  );
}

function zoneFormValues(zone) {
  if (!zone) return defaults;
  return {
    ...defaults,
    name: zone.name ?? "",
    code: zone.code ?? "",
    zoneType: zone.zoneType ?? "general",
    occupancyLimit: zone.occupancyLimit ?? 20,
    positionX: zone.position?.x ?? 0,
    positionY: zone.position?.y ?? 0,
    positionZ: zone.position?.z ?? 0,
    width: zone.dimensions?.width ?? 6,
    height: zone.dimensions?.height ?? 3,
    depth: zone.dimensions?.depth ?? 6,
    temperatureMin: zone.environmentalThresholds?.temperature?.min ?? 18,
    temperatureMax: zone.environmentalThresholds?.temperature?.max ?? 26,
    humidityMin: zone.environmentalThresholds?.humidity?.min ?? 30,
    humidityMax: zone.environmentalThresholds?.humidity?.max ?? 70,
    co2Min: zone.environmentalThresholds?.co2?.min ?? 350,
    co2Max: zone.environmentalThresholds?.co2?.max ?? 1000,
    description: zone.description ?? "",
  };
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

function NumberField({ label, registration, min, error }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" step="0.1" min={min} {...registration} />
      {error && <small>{error}</small>}
    </label>
  );
}
