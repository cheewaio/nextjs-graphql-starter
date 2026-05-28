import { authResolvers } from "@/graphql/resolvers/auth";
import { noteResolvers } from "@/graphql/resolvers/note";

export const resolvers = {
  DateTime: authResolvers.DateTime,
  Query: {
    ...authResolvers.Query,
    ...noteResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...noteResolvers.Mutation,
  },
};
