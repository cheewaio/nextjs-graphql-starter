import { GraphQLError } from "graphql";

import { requireUser, requireUserOrGraphQLError, type GraphQLContext } from "@/graphql/context";
import { mutationFailure, mutationSuccess } from "@/graphql/support/mutation-response";
import {
  type FilterOperator,
  parsePaginationInput,
} from "@/graphql/support/query-input";
import { isAppError } from "@/lib/errors";
import { NoteService } from "@/services/note-service";

const supportedFilterFields: Record<string, FilterOperator[]> = {
  id: ["EQ", "NEQ"],
  title: ["EQ", "NEQ", "CONTAINS"],
  content: ["EQ", "NEQ", "CONTAINS"],
};

const supportedSortFields = [
  "id",
  "title",
  "content",
  "createdAt",
  "updatedAt",
] as const;

const noteService = new NoteService();

function toQueryError(error: unknown) {
  if (isAppError(error)) {
    return new GraphQLError(error.message, {
      extensions: {
        code: error.graphqlCode,
        statusCode: error.statusCode,
      },
    });
  }

  throw error;
}

export const noteResolvers = {
  Query: {
    note: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const user = requireUserOrGraphQLError(context);

      try {
        return await noteService.getById(user.username, args.id);
      } catch (error) {
        throw toQueryError(error);
      }
    },
    notes: async (
      _parent: unknown,
      args: {
        input?: {
          mode?: "CURSOR" | "OFFSET" | null;
          pageSize?: number | null;
          pageNumber?: number | null;
          cursor?: string | null;
          search?: { query: string; fields?: string[] | null } | null;
          sort?: { field: string; order?: "ASC" | "DESC" | null }[] | null;
          filter?: {
            filters?: {
              field: string;
              operator:
                | "EQ"
                | "NEQ"
                | "CONTAINS"
                | "GT"
                | "GTE"
                | "LT"
                | "LTE"
                | "IS_NULL"
                | "IS_NOT_NULL";
              value?: string | null;
            }[] | null;
            logic?: "AND" | "OR" | null;
          } | null;
        } | null;
      },
      context: GraphQLContext
    ) => {
      const user = requireUserOrGraphQLError(context);

      try {
        return await noteService.list(
          user.username,
          parsePaginationInput(args.input, supportedSortFields, supportedFilterFields)
        );
      } catch (error) {
        throw toQueryError(error);
      }
    },
  },
  Mutation: {
    createNote: async (
      _parent: unknown,
      args: { input: { title: string; content: string } },
      context: GraphQLContext
    ) => {
      try {
        const user = requireUser(context);
        const note = await noteService.create(user.username, args.input);

        return mutationSuccess(
          {
            note,
          },
          "note created"
        );
      } catch (error) {
        return mutationFailure(
          {
            note: null,
          },
          error
        );
      }
    },
    updateNote: async (
      _parent: unknown,
      args: {
        id: string;
        input: { title?: string | null; content?: string | null };
      },
      context: GraphQLContext
    ) => {
      try {
        const user = requireUser(context);
        const note = await noteService.update(user.username, args.id, args.input);

        return mutationSuccess(
          {
            note,
          },
          "note updated"
        );
      } catch (error) {
        return mutationFailure(
          {
            note: null,
          },
          error
        );
      }
    },
    deleteNote: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      try {
        const user = requireUser(context);
        await noteService.delete(user.username, args.id);

        return mutationSuccess({}, "note deleted");
      } catch (error) {
        return mutationFailure({}, error);
      }
    },
  },
};
