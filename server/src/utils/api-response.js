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
