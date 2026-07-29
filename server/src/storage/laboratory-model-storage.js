import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function createLaboratoryModelStorage({
  uploadsDirectory = path.join(serverDirectory, "uploads"),
} = {}) {
  return {
    async save({ universityId, file, extension }) {
      const modelDirectory = path.join(
        uploadsDirectory,
        "universities",
        String(universityId),
        "models",
      );
      const storedName = `${randomUUID()}${extension}`;
      const absolutePath = path.join(modelDirectory, storedName);
      const relativePath = path
        .relative(serverDirectory, absolutePath)
        .replaceAll(path.sep, "/");

      await fs.mkdir(modelDirectory, { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });
      return {
        storedName,
        relativePath,
        checksumSha256: createHash("sha256")
          .update(file.buffer)
          .digest("hex"),
      };
    },

    async remove(relativePath) {
      const absolutePath = path.resolve(serverDirectory, relativePath);
      const uploadsRoot = path.resolve(uploadsDirectory);
      if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
        throw new Error("Rruga e modelit nuk është brenda uploads.");
      }
      await fs.rm(absolutePath, { force: true });
    },

    resolve(relativePath) {
      const absolutePath = path.resolve(serverDirectory, relativePath);
      const uploadsRoot = path.resolve(uploadsDirectory);
      if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return null;
      return absolutePath;
    },
  };
}
