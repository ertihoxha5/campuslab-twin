import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function createUniversityLogoStorage({
  uploadsDirectory = path.join(serverDirectory, "uploads"),
} = {}) {
  return {
    async save({ universityId, file, extension }) {
      const directory = path.join(
        uploadsDirectory,
        "universities",
        String(universityId),
        "branding",
      );
      const storedName = `${randomUUID()}${extension}`;
      const absolutePath = path.join(directory, storedName);
      const relativePath = path
        .relative(serverDirectory, absolutePath)
        .replaceAll(path.sep, "/");
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });
      return {
        storedName,
        relativePath,
        checksumSha256: createHash("sha256").update(file.buffer).digest("hex"),
      };
    },
    async remove(relativePath) {
      const absolutePath = path.resolve(serverDirectory, relativePath);
      const root = path.resolve(uploadsDirectory);
      if (!absolutePath.startsWith(`${root}${path.sep}`))
        throw new Error("Rruga e logos nuk është brenda uploads.");
      await fs.rm(absolutePath, { force: true });
    },
  };
}
