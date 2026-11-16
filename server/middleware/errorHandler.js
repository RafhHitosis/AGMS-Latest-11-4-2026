export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = Number(err.statusCode || err.status) || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode >= 500
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
