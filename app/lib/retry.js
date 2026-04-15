/**
 * Retry con exponential backoff per errori Anthropic temporanei.
 * Ritenta su: overloaded_error, rate_limit, 529, 529, 503, 502.
 */
const RETRYABLE = new Set(["overloaded_error", "rate_limit_error"]);
const RETRYABLE_STATUS = new Set([429, 502, 503, 529]);

export async function withRetry(fn, { maxAttempts = 3, baseDelay = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        RETRYABLE.has(err.error?.type) ||
        RETRYABLE_STATUS.has(err.status) ||
        err.message?.includes("overloaded") ||
        err.message?.includes("rate limit");

      if (!isRetryable || attempt === maxAttempts) throw err;

      const delay = baseDelay * Math.pow(2, attempt - 1); // 2s, 4s
      console.log(`Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
