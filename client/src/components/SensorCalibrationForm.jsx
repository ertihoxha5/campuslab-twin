import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.jsx";

const calibrationSchema = z
  .object({
    result: z.enum(["passed", "adjusted", "failed"]),
    calibratedAt: z.string().min(1, "Zgjidhni datën e kalibrimit."),
    calibrationDueAt: z.string().optional(),
    notes: z
      .string()
      .trim()
      .max(2000, "Shënimet mund të kenë deri në 2000 karaktere.")
      .optional(),
  })
  .superRefine((calibration, context) => {
    if (
      calibration.calibrationDueAt &&
      calibration.calibrationDueAt <= calibration.calibratedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["calibrationDueAt"],
        message: "Kalibrimi i ardhshëm duhet të jetë pas kalibrimit aktual.",
      });
    }
  });

export function SensorCalibrationForm({ saving, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(calibrationSchema),
    defaultValues: {
      result: "passed",
      calibratedAt: localDateTime(),
      calibrationDueAt: "",
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="equipment-form-grid">
        <Field
          label="Rezultati"
          input={
            <select {...register("result")}>
              <option value="passed">Kaluar</option>
              <option value="adjusted">Rregulluar</option>
              <option value="failed">Dështuar</option>
            </select>
          }
        />
        <Field
          label="Data e kalibrimit"
          error={errors.calibratedAt?.message}
          input={<input type="datetime-local" {...register("calibratedAt")} />}
        />
        <Field
          label="Kalibrimi i ardhshëm"
          error={errors.calibrationDueAt?.message}
          input={
            <input type="datetime-local" {...register("calibrationDueAt")} />
          }
        />
        <Field
          className="equipment-form-wide"
          label="Shënime"
          error={errors.notes?.message}
          input={
            <textarea
              rows="4"
              {...register("notes")}
              placeholder="Përshkruani kontrollin ose rregullimet e kryera."
            />
          }
        />
      </div>
      <footer>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulo
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Po ruhet…" : "Regjistro kalibrimin"}
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

function localDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
