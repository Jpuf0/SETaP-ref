import type { z } from "zod";

export class NotFoundError extends Error {
  status = 404;
}

export class ForbiddenError extends Error {
  status = 403;
}

export class ValidationError extends Error {
  status = 400;
}

export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}
