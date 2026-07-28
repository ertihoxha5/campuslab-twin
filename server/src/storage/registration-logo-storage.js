import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function createRegistrationLogoStorage({
  uploadsDirectory = path.join(serverDirectory, "uploads"),
} = {}) {
  return {
    async save(file) {
      if (!file) {
        return null;
      }

      const requestDirectory = path.join(
        uploadsDirectory,
        "registration-requests",
        randomUUID(),
      );
      const fileName = `logo${extensionByMimeType[file.mimetype]}`;
      const absolutePath = path.join(requestDirectory, fileName);
      const relativePath = path
        .relative(serverDirectory, absolutePath)
        .replaceAll(path.sep, "/");

      await fs.mkdir(requestDirectory, { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: "wx" });
      return relativePath;
    },

    async remove(relativePath) {
      if (!relativePath) {
        return;
      }

      const absolutePath = path.resolve(serverDirectory, relativePath);
      const uploadsRoot = path.resolve(uploadsDirectory);

      if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
        throw new Error("Rruga e skedarit nuk është brenda uploads.");
      }

      await fs.rm(path.dirname(absolutePath), {
        recursive: true,
        force: true,
      });
    },
  };
}
