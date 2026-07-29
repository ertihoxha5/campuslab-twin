import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../utils/app-error.js";

const invalidModel = (message) =>
  new AppError({
    status: 422,
    code: "INVALID_MODEL",
    message,
  });

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Pamja virtuale e laboratorit nuk u gjet.",
  });

export function createLaboratoryModelService({ repository, storage }) {
  return {
    async upload(file, context) {
      const validated = validateModel(file);
      const stored = await storage.save({
        universityId: context.universityId,
        file,
        extension: validated.extension,
      });
      try {
        const model = await repository.attach({
          universityId: context.universityId,
          laboratoryId: context.laboratoryId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          file: {
            originalName: file.originalname,
            mimeType: validated.mimeType,
            sizeBytes: file.size,
            ...stored,
          },
        });
        if (!model) throw notFound();
        return model;
      } catch (error) {
        await storage.remove(stored.relativePath);
        throw error;
      }
    },

    async getDownload(context) {
      const model = await repository.findCurrent({
        universityId: context.universityId,
        laboratoryId: context.laboratoryId,
      });
      if (!model) throw notFound();
      const absolutePath = storage.resolve(model.relativePath);
      if (!absolutePath) throw notFound();
      try {
        const stats = await fs.stat(absolutePath);
        if (!stats.isFile()) throw notFound();
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw notFound();
      }
      return { ...model, absolutePath };
    },

    async remove(context) {
      const model = await repository.detach({
        universityId: context.universityId,
        laboratoryId: context.laboratoryId,
        userId: context.userId,
        ipAddress: context.ipAddress,
      });
      if (!model) throw notFound();
      return model;
    },
  };
}

function validateModel(file) {
  if (!file) {
    throw invalidModel("Zgjidhni një fotografi ose model GLB/GLTF.");
  }
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    const isJpeg =
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    if (!isJpeg) {
      throw invalidModel("Përmbajtja e fotografisë JPG nuk është e vlefshme.");
    }
    return { extension, mimeType: "image/jpeg" };
  }

  if (extension === ".png") {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (
      file.buffer.length < signature.length ||
      !file.buffer.subarray(0, signature.length).equals(signature)
    ) {
      throw invalidModel("Përmbajtja e fotografisë PNG nuk është e vlefshme.");
    }
    return { extension, mimeType: "image/png" };
  }

  if (extension === ".webp") {
    const isWebp =
      file.buffer.length >= 12 &&
      file.buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      file.buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!isWebp) {
      throw invalidModel("Përmbajtja e fotografisë WebP nuk është e vlefshme.");
    }
    return { extension, mimeType: "image/webp" };
  }

  if (extension === ".glb") {
    const isGlb =
      file.buffer.length >= 12 &&
      file.buffer.subarray(0, 4).toString("ascii") === "glTF" &&
      file.buffer.readUInt32LE(4) === 2;
    if (!isGlb) {
      throw invalidModel("Përmbajtja e skedarit GLB nuk është e vlefshme.");
    }
    return { extension, mimeType: "model/gltf-binary" };
  }

  if (extension === ".gltf") {
    let document;
    try {
      document = JSON.parse(file.buffer.toString("utf8"));
    } catch {
      throw invalidModel("Përmbajtja e skedarit GLTF nuk është e vlefshme.");
    }
    if (!String(document?.asset?.version ?? "").startsWith("2")) {
      throw invalidModel("Modeli GLTF duhet të përdorë versionin 2.");
    }
    const externalUris = [
      ...(document.buffers ?? []),
      ...(document.images ?? []),
    ].some(
      (resource) =>
        resource.uri &&
        !resource.uri.startsWith("data:") &&
        !resource.bufferView,
    );
    if (externalUris) {
      throw invalidModel(
        "Skedari GLTF duhet të jetë i vetë-përmbajtshëm; përdorni GLB kur modeli ka tekstura ose skedarë të jashtëm.",
      );
    }
    return { extension, mimeType: "model/gltf+json" };
  }

  throw invalidModel("Skedari duhet të jetë JPG, PNG, WebP, GLB ose GLTF.");
}
