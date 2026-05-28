import { DateTimeResolver } from "graphql-scalars";

import { requireUserOrGraphQLError, type GraphQLContext } from "@/graphql/context";
import { mutationFailure, mutationSuccess } from "@/graphql/support/mutation-response";
import * as authService from "@/services/auth-service";

export const authResolvers = {
  DateTime: DateTimeResolver,
  Query: {
    me: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireUserOrGraphQLError(context);

      return {
        id: user.username,
        username: user.username,
      };
    },
  },
  Mutation: {
    login: async (_parent: unknown, args: { username: string }) => {
      try {
        const result = await authService.login(args.username);

        return mutationSuccess(
          {
            accessToken: result.accessToken,
          },
          "login succeeded"
        );
      } catch (error) {
        return mutationFailure(
          {
            accessToken: null,
          },
          error
        );
      }
    },
  },
};
