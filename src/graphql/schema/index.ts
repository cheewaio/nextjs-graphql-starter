import { authTypeDefs } from "@/graphql/schema/auth";
import { baseTypeDefs } from "@/graphql/schema/base";
import { noteTypeDefs } from "@/graphql/schema/note";

export const typeDefs = [baseTypeDefs, authTypeDefs, noteTypeDefs];
