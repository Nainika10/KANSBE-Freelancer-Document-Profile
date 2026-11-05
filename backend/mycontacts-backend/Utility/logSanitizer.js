const SENSITIVE_KEY_PATTERN = /(password|pass|secret|token|authorization|cookie|session|otp|code|api[_-]?key|jwt|refresh|access|signature|email|phone|mobile|contact|dob|address|ssn|resume|cv)/i;

function sanitizeForLogging(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item, seen));
  }

  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  const sanitized = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = sanitizeForLogging(item, seen);
  }

  return sanitized;
}

module.exports = {
  sanitizeForLogging,
};
