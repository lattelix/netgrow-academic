import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Требуется вход в систему") {
  return errorResponse(401, "unauthorized", message);
}

export function forbidden(message = "Недостаточно прав для этого действия") {
  return errorResponse(403, "forbidden", message);
}

export function notFound(message = "Объект не найден") {
  return errorResponse(404, "not_found", message);
}

export function conflict(message: string, details?: unknown) {
  return errorResponse(409, "conflict", message, details);
}

export function badRequest(error: ZodError | string) {
  if (typeof error === "string") {
    return errorResponse(400, "bad_request", error);
  }
  return errorResponse(400, "validation_error", "Некорректные данные запроса", error.flatten());
}

export function serverError(message = "Внутренняя ошибка сервера") {
  return errorResponse(500, "server_error", message);
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
