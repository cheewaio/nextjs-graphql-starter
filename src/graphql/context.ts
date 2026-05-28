import { GraphQLError } from "graphql";

import { type AuthUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { isLocalAuthBypassEnabled } from "@/lib/env";

export type GraphQLContext = {
  user: AuthUser | null;
};

export function requireUser(context: GraphQLContext) {
  if (context.user) {
    return context.user;
  }

  if (isLocalAuthBypassEnabled()) {
    return {
      username: "local@example.com",
    };
  }

  throw new AppError("Authentication required.", 401, "UNAUTHENTICATED");
}

export function requireUserOrGraphQLError(context: GraphQLContext) {
  try {
    return requireUser(context);
  } catch (error) {
    if (error instanceof AppError) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.graphqlCode,
          statusCode: error.statusCode,
        },
      });
    }

    throw error;
  }
}
