import { failure } from "../utils/api-response.js";

export function notFoundHandler(request, response) {
  return failure(response, {
    status: 404,
    code: "NOT_FOUND",
    message: "Burimi i kërkuar nuk u gjet.",
    details: { path: request.originalUrl },
  });
}

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) {
    return;
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  return failure(response, {
    status,
    code: error.code ?? (isServerError ? "SERVER_ERROR" : "REQUEST_ERROR"),
    message: isServerError
      ? "Ndodhi një gabim në server. Ju lutemi provoni përsëri."
      : error.message,
    details: error.details,
  });
}
