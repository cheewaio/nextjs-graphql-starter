export class AppError extends Error {
  statusCode: number;
  graphqlCode: string;

  constructor(
    message: string,
    statusCode = 400,
    graphqlCode = "BAD_USER_INPUT"
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.graphqlCode = graphqlCode;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown) {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, "INTERNAL_SERVER_ERROR");
  }

  return new AppError("Something went wrong.", 500, "INTERNAL_SERVER_ERROR");
}
