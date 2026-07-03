import { z } from "zod";

export const listingIdSchema = z.string().uuid("Invalid listing id.");
export const userIdSchema = z.string().uuid("Invalid user id.");
export const reportIdSchema = z.string().uuid("Invalid report id.");
export const visitorIdSchema = z.string().trim().min(1, "Visitor id is required.").max(128);

export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  return schema.parse(input);
}

export function formatZodError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid input.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Invalid input.";
}
