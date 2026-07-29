import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../../utils/app-error.js";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const fileNotFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Skedari i kërkuar nuk u gjet.",
  });

export function createFileService({
  repository,
  baseDirectory = serverDirectory,
  uploadsDirectory = path.join(baseDirectory, "uploads"),
}) {
  return {
    async getDownload({ universityId, fileId }) {
      const storedFile = await repository.findById({ universityId, fileId });
      if (!storedFile) throw fileNotFound();

      const absolutePath = path.resolve(baseDirectory, storedFile.relativePath);
      const uploadsRoot = path.resolve(uploadsDirectory);
      if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
        throw fileNotFound();
      }

      try {
        const fileStats = await fs.stat(absolutePath);
        if (!fileStats.isFile()) throw fileNotFound();
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw fileNotFound();
      }

      return Object.freeze({ ...storedFile, absolutePath });
    },
  };
}
