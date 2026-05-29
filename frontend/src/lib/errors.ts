import { AxiosError } from "axios";

// Extract a human-readable message from an API error. FastAPI returns
// `{ "detail": "..." }` on HTTPException.
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  }
  return fallback;
}
