import express from "express";

export function createFileRouter({ fileService, authenticateTenant }) {
  const router = express.Router();

  router.get(
    "/:fileId",
    authenticateTenant,
    async (request, response, next) => {
      try {
        const storedFile = await fileService.getDownload({
          universityId: request.auth.universityId,
          fileId: request.params.fileId,
        });

        response.download(
          storedFile.absolutePath,
          storedFile.originalName,
          {
            headers: {
              "Cache-Control": "private, no-store",
              "Content-Type": storedFile.mimeType,
            },
          },
          (error) => {
            if (error && !response.headersSent) next(error);
          },
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
