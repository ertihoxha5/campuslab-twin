export function success(response, { status = 200, data, meta } = {}) {
  return response.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function failure(
  response,
  { status = 500, code = "SERVER_ERROR", message, details },
) {
  return response.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

export function validationFailure(response, details) {
  return failure(response, {
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Të dhënat e dërguara nuk janë të vlefshme.",
    details,
  });
}

export function forbiddenFailure(response) {
  return failure(response, {
    status: 403,
    code: "FORBIDDEN",
    message: "Nuk keni leje për të kryer këtë veprim.",
  });
}

export function notFoundFailure(response, details) {
  return failure(response, {
    status: 404,
    code: "NOT_FOUND",
    message: "Burimi i kërkuar nuk u gjet.",
    details,
  });
}

export function serverFailure(response) {
  return failure(response, {
    status: 500,
    code: "SERVER_ERROR",
    message: "Ndodhi një gabim në server. Ju lutemi provoni përsëri.",
  });
}
