import pinoHttp from "pino-http";

export function createRequestLogger({ enabled = true } = {}) {
  return pinoHttp({
    enabled,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
      ],
      censor: "[E REDAKTUAR]",
    },
    serializers: {
      req(request) {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
        };
      },
    },
  });
}
