import { toAppError } from "@/lib/errors";

export type MutationResponseShape = {
  code: number;
  success: boolean;
  message: string | null;
};

export function mutationSuccess<T extends object>(
  payload: T,
  message = "mutation succeeded",
  code = 200
): T & MutationResponseShape {
  return {
    ...payload,
    code,
    success: true,
    message,
  };
}

export function mutationFailure<T extends object>(
  payload: T,
  error: unknown
): T & MutationResponseShape {
  const appError = toAppError(error);

  return {
    ...payload,
    code: appError.statusCode,
    success: false,
    message: appError.message,
  };
}
