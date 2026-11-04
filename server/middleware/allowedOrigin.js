function configuredOrigins() {
  return (process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (configuredOrigins().includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)) return true;

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;

    const octets = url.hostname.split(".").map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return false;
    }

    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  } catch {
    return false;
  }
}

export function requireAllowedOrigin(req, res, next) {
  if (!isAllowedOrigin(req.get("origin"))) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }
  next();
}
