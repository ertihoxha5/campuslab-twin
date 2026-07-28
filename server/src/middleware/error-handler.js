import {
  failure,
  notFoundFailure,
  serverFailure,
  validationFailure,
} from "../utils/api-response.js";

export function notFoundHandler(request, response) {
  return notFoundFailure(response, { path: request.originalUrl });
}

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return validationFailure(response, {
      body: ["Formati JSON i kërkesës nuk është i vlefshëm."],
    });
  }

  if (error.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Logoja nuk duhet të jetë më e madhe se 2 MB."
        : "Logoja nuk mund të përpunohej.";

    return validationFailure(response, { logo: [message] });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;

  if (status >= 500) {
    return serverFailure(response);
  }

  return failure(response, {
    status,
    code: error.code ?? "REQUEST_ERROR",
    message: error.publicMessage ?? "Kërkesa nuk mund të përfundohej.",
    details: error.details,
  });
}
