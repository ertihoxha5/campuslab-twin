import express from "express";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        service: "campuslab-twin-api",
        status: "healthy",
      },
    });
  });

  return app;
}
