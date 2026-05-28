import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";

import { type GraphQLContext } from "@/graphql/context";
import {
  createApolloGraphQLServer,
  createGraphQLContext,
} from "@/graphql/server";

const server = createApolloGraphQLServer();

const apolloHandler = startServerAndCreateNextHandler<
  NextRequest,
  GraphQLContext
>(
  server,
  {
    context: (request) =>
      createGraphQLContext(request.headers.get("authorization")),
  }
);

export async function GET(request: NextRequest) {
  return apolloHandler(request);
}

export async function POST(request: NextRequest) {
  return apolloHandler(request);
}
