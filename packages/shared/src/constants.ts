export const ApiErrorCode = {
    BAD_REQUEST: "BAD_REQUEST",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
    CONFLICT: "CONFLICT",
    INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];