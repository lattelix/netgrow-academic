interface PgErrorLike {
  code?: string;
}

function pgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as PgErrorLike).code;
}

// https://www.postgresql.org/docs/current/errcodes-appendix.html
export function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === "23505";
}
