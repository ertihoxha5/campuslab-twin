import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function createMaintenanceEvidenceStorage({
  uploadsDirectory = path.join(serverDirectory, "uploads"),
} = {}) {
  return {
    async save({ universityId, taskId, file, extension }) {
      const evidenceDirectory = path.join(
        uploadsDirectory,
        "universities",
        String(universityId),
        "maintenance",
        String(taskId),
      );
      const storedName = `${randomUUID()}${extension}`;
      const absolutePath = path.join(evidenceDirectory, storedName);
      const relativePath = path
        .relative(serverDirectory, absolutePath)
        .replaceAll(path.sep, "/");

      await fs.mkdir(evidenceDirectory, { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });
      return {
        storedName,
        relativePath,
        checksumSha256: createHash("sha256").update(file.buffer).digest("hex"),
      };
    },

    async remove(relativePath) {
      const absolutePath = path.resolve(serverDirectory, relativePath);
      const uploadsRoot = path.resolve(uploadsDirectory);
      if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
        throw new Error("Rruga e evidencës nuk është brenda uploads.");
      }
      await fs.rm(absolutePath, { force: true });
    },
  };
}
