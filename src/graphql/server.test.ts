// @vitest-environment node

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createApolloGraphQLServer, createGraphQLContext } from "@/graphql/server";
import { login } from "@/services/auth-service";

describe("graphql server", () => {
  const server = createApolloGraphQLServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    await prisma.note.deleteMany();
  });

  it("returns login mutation envelopes", async () => {
    const result = await server.executeOperation({
      query:
        "mutation($username:String!){ login(username:$username){ code success message accessToken } }",
      variables: { username: "user@example.com" },
    });

    expect(result.body.kind).toBe("single");
    if (result.body.kind !== "single") {
      return;
    }

    expect(result.body.singleResult.data).toMatchObject({
      login: {
        code: 200,
        success: true,
        accessToken: expect.any(String),
      },
    });
  });

  it("rejects unauthenticated me query", async () => {
    const result = await server.executeOperation({
      query: "query { me { username } }",
    });

    expect(result.body.kind).toBe("single");
    if (result.body.kind !== "single") {
      return;
    }

    expect(result.body.singleResult.errors?.[0]?.message).toBe(
      "Authentication required."
    );
  });

  it("returns mutation failures for unauthenticated note writes", async () => {
    const result = await server.executeOperation({
      query:
        "mutation { createNote(input:{title:\"A\", content:\"B\"}) { code success message note { id } } }",
    });

    expect(result.body.kind).toBe("single");
    if (result.body.kind !== "single") {
      return;
    }

    expect(result.body.singleResult.data).toEqual({
      createNote: {
        code: 401,
        success: false,
        message: "Authentication required.",
        note: null,
      },
    });
  });

  it("supports authenticated note CRUD and listing", async () => {
    const auth = await login("user@example.com");
    const contextValue = await createGraphQLContext(
      `Bearer ${auth.accessToken}`
    );

    const createResult = await server.executeOperation(
      {
        query:
          "mutation($input:CreateNoteInput!){ createNote(input:$input){ success note { id title } } }",
        variables: {
          input: { title: "First note", content: "Hello world" },
        },
      },
      { contextValue }
    );

    expect(createResult.body.kind).toBe("single");
    if (createResult.body.kind !== "single") {
      return;
    }

    const createData = createResult.body.singleResult.data as {
      createNote?: { note?: { id: string } | null };
    };
    const noteId = createData.createNote?.note?.id;
    expect(noteId).toEqual(expect.any(String));

    const listResult = await server.executeOperation(
      {
        query:
          "query($input:PageInput,$filter:FilterInput){ notes(input:$input, filter:$filter){ items { id title } pageInfo { startCursor endCursor hasNextPage hasPreviousPage } } }",
        variables: {
          input: { first: 5 },
          filter: {
            filters: [{ field: "title", operator: "CONTAINS", value: "First" }],
          },
        },
      },
      { contextValue }
    );

    expect(listResult.body.kind).toBe("single");
    if (listResult.body.kind !== "single") {
      return;
    }

    expect(listResult.body.singleResult.data).toMatchObject({
      notes: {
        items: [{ id: noteId, title: "First note" }],
        pageInfo: {
          startCursor: expect.any(String),
          endCursor: expect.any(String),
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });

    const deleteResult = await server.executeOperation(
      {
        query:
          "mutation($id:ID!){ deleteNote(id:$id){ code success message } }",
        variables: { id: noteId },
      },
      { contextValue }
    );

    expect(deleteResult.body.kind).toBe("single");
    if (deleteResult.body.kind !== "single") {
      return;
    }

    expect(deleteResult.body.singleResult.data).toEqual({
      deleteNote: {
        code: 200,
        success: true,
        message: "note deleted",
      },
    });
  });

  it("supports bidirectional pagination", async () => {
    const auth = await login("user@example.com");
    const contextValue = await createGraphQLContext(
      `Bearer ${auth.accessToken}`
    );

    for (const input of [
      { title: "First note", content: "A" },
      { title: "Second note", content: "B" },
      { title: "Third note", content: "C" },
    ]) {
      await server.executeOperation(
        {
          query:
            "mutation($input:CreateNoteInput!){ createNote(input:$input){ success } }",
          variables: { input },
        },
        { contextValue }
      );
    }

    const firstPage = await server.executeOperation(
      {
        query:
          "query($input:PageInput){ notes(input:$input){ items { title } pageInfo { startCursor endCursor hasNextPage hasPreviousPage } } }",
        variables: { input: { first: 2, sort: [{ field: "title", asc: true }] } },
      },
      { contextValue }
    );

    expect(firstPage.body.kind).toBe("single");
    if (firstPage.body.kind !== "single") {
      return;
    }

    const firstPageData = firstPage.body.singleResult.data as {
      notes: {
        pageInfo: {
          endCursor: string | null;
          startCursor: string | null;
        };
      };
    };

    expect(firstPage.body.singleResult.data).toMatchObject({
      notes: {
        items: [{ title: "First note" }, { title: "Second note" }],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    });

    const endCursor = firstPageData.notes.pageInfo.endCursor;
    const startCursor = firstPageData.notes.pageInfo.startCursor;

    const nextPage = await server.executeOperation(
      {
        query:
          "query($input:PageInput){ notes(input:$input){ items { title } pageInfo { hasNextPage hasPreviousPage } } }",
        variables: {
          input: {
            first: 1,
            after: endCursor,
            sort: [{ field: "title", asc: true }],
          },
        },
      },
      { contextValue }
    );

    expect(nextPage.body.kind).toBe("single");
    if (nextPage.body.kind !== "single") {
      return;
    }

    expect(nextPage.body.singleResult.data).toMatchObject({
      notes: {
        items: [{ title: "Third note" }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
        },
      },
    });

    const previousPage = await server.executeOperation(
      {
        query:
          "query($input:PageInput){ notes(input:$input){ items { title } pageInfo { hasNextPage hasPreviousPage } } }",
        variables: {
          input: {
            last: 1,
            before: startCursor,
            sort: [{ field: "title", asc: true }],
          },
        },
      },
      { contextValue }
    );

    expect(previousPage.body.kind).toBe("single");
    if (previousPage.body.kind !== "single") {
      return;
    }

    expect(previousPage.body.singleResult.data).toMatchObject({
      notes: {
        items: [],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    });
  });
});
