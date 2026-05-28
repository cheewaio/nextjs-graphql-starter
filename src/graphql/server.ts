import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { GraphQLError } from "graphql";

import { readBearerToken, verifyAccessToken } from "@/lib/auth";
import { isPlaygroundEnabled } from "@/lib/env";
import { type GraphQLContext } from "@/graphql/context";
import { resolvers } from "@/graphql/resolvers";
import { typeDefs } from "@/graphql/schema";

export function createApolloGraphQLServer() {
  return new ApolloServer<GraphQLContext>({
    resolvers,
    typeDefs,
    introspection: process.env.NODE_ENV !== "production",
    plugins: [
      isPlaygroundEnabled()
        ? ApolloServerPluginLandingPageLocalDefault({ embed: true })
        : ApolloServerPluginLandingPageDisabled(),
    ],
  });
}

export async function createGraphQLContext(authorization: string | null) {
  const token = readBearerToken(authorization);

  if (!token) {
    return { user: null };
  }

  try {
    return { user: await verifyAccessToken(token) };
  } catch {
    throw new GraphQLError("Invalid access token.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}
