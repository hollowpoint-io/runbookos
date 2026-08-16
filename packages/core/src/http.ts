/**
 * Shared HTTP reliability layer for RunbookOS MCP packages.
 *
 * Wraps fetch with per-attempt timeouts, bounded retries with exponential
 * backoff, Retry-After support, and actionable auth error messages. Vendor
 * APIs (Shopify, Ahrefs, Google) throttle and blip routinely; daily-use
 * tools must absorb that without surfacing transient noise to the agent.
 */

export interface FetchWithRetryOptions {
  /** Label used in error messages, e.g. "Shopify GraphQL". */
  label: string;
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Per-attempt timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
  /** Base backoff delay in milliseconds; doubles per retry. Default 500. */
  backoffMs?: number;
  /** Extra predicate marking a response retryable (e.g. Shopify THROTTLED on HTTP 200). */
  isRetryableResponse?: (response: Response) => boolean | Promise<boolean>;
}

export interface RetryAttemptError {
  attempt: number;
  reason: string;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

/**
 * Hint appended to auth failures so the error is actionable, not just a code.
 */
export function authHint(status: number, label: string, envVars: string[]): string | undefined {
  if (status === 401) {
    return `${label} rejected the credential (HTTP 401). The token is missing, expired, or revoked — refresh ${envVars.join(" / ")} and retry.`;
  }
  if (status === 403) {
    return `${label} refused access (HTTP 403). The credential is valid but lacks the required scope/permission — check the app scopes behind ${envVars.join(" / ")}.`;
  }
  return undefined;
}

function retryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), 60_000);
  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch with bounded retries, per-attempt timeout, and Retry-After support.
 *
 * Retries on: network errors, per-attempt timeouts, 408/429/5xx responses,
 * and any response the caller marks retryable via isRetryableResponse.
 * Does NOT retry other 4xx responses — those are caller errors and retrying
 * them only burns rate limit. Returns the final Response (ok or not); only
 * throws when every attempt failed at the network layer or was retryable.
 */
export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit,
  options: FetchWithRetryOptions,
): Promise<Response> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const backoffMs = options.backoffMs ?? 500;
  const failures: RetryAttemptError[] = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const reason = error instanceof Error && error.name === "TimeoutError"
        ? `timed out after ${timeoutMs}ms`
        : error instanceof Error ? error.message : String(error);
      failures.push({ attempt, reason });
      if (attempt < attempts) await delay(backoffMs * 2 ** (attempt - 1));
      continue;
    }

    const callerRetryable = options.isRetryableResponse
      ? await options.isRetryableResponse(response.clone())
      : false;

    if (!isRetryableStatus(response.status) && !callerRetryable) {
      return response;
    }

    failures.push({ attempt, reason: callerRetryable && response.ok ? "vendor throttle signal" : `HTTP ${response.status}` });
    if (attempt < attempts) {
      const wait = retryAfterMs(response) ?? backoffMs * 2 ** (attempt - 1);
      await delay(wait);
      continue;
    }
    return response;
  }

  const detail = failures.map((failure) => `attempt ${failure.attempt}: ${failure.reason}`).join("; ");
  throw new Error(`${options.label} request failed after ${attempts} attempt(s) — ${detail}.`);
}
