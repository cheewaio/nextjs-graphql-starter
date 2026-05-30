// @vitest-environment node

import { describe, expect, it } from "vitest";

import { encodeCursor } from "@/lib/cursor";
import {
  parseFilterInput,
  parsePaginationInput,
} from "@/graphql/support/query-input";

describe("query input helpers", () => {
  it("applies pagination defaults and size caps", () => {
    expect(parsePaginationInput()).toEqual({
      mode: "CURSOR",
      pageSize: 20,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(parsePaginationInput({ pageSize: 999 })).toEqual({
      mode: "CURSOR",
      pageSize: 100,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });
  });

  it("parses cursor mode with after cursor", () => {
    expect(
      parsePaginationInput(
        {
          cursor: encodeCursor({
            id: "note-1",
            sortValues: ["2024-01-01T00:00:00.000Z"],
          }),
          pageSize: 5,
          sort: [{ field: "createdAt", order: "DESC" }],
        },
        ["createdAt"]
      )
    ).toEqual({
      mode: "CURSOR",
      pageSize: 5,
      pageNumber: 0,
      after: {
        id: "note-1",
        sortValues: ["2024-01-01T00:00:00.000Z"],
      },
      sort: [{ field: "createdAt", order: "DESC" }],
      search: null,
      filter: { logic: "AND", filters: [] },
    });
  });

  it("parses offset mode with pageNumber", () => {
    expect(
      parsePaginationInput({
        mode: "OFFSET",
        pageSize: 10,
        pageNumber: 2,
      })
    ).toEqual({
      mode: "OFFSET",
      pageSize: 10,
      pageNumber: 2,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });
  });

  it("rejects conflicting mode parameters", () => {
    expect(() =>
      parsePaginationInput({
        mode: "OFFSET",
        cursor: encodeCursor({ id: "n", sortValues: ["x"] }),
      })
    ).toThrow("cursor cannot be used with OFFSET mode");

    expect(() =>
      parsePaginationInput({
        mode: "CURSOR",
        pageNumber: 1,
      })
    ).toThrow("pageNumber cannot be used with CURSOR mode");
  });

  it("rejects invalid sort fields", () => {
    expect(() =>
      parsePaginationInput(
        { sort: [{ field: "ownerUsername", order: "ASC" }] },
        ["title"]
      )
    ).toThrow("Unsupported sort field");
  });

  it("rejects invalid cursors", () => {
    expect(() =>
      parsePaginationInput({ cursor: "bad-cursor" })
    ).toThrow("Invalid after cursor.");
  });

  it("rejects unsupported filters", () => {
    expect(() =>
      parsePaginationInput(
        {
          filter: {
            filters: [{ field: "bogus", operator: "EQ", value: "x" }],
          },
        },
        undefined,
        { title: ["EQ", "CONTAINS"] }
      )
    ).toThrow("Unsupported filter field");
  });

  it("normalizes supported filters", () => {
    expect(
      parseFilterInput(
        {
          logic: "OR",
          filters: [{ field: "title", operator: "CONTAINS", value: "  hi  " }],
        },
        { title: ["CONTAINS"] }
      )
    ).toEqual({
      logic: "OR",
      filters: [{ field: "title", operator: "CONTAINS", value: "hi" }],
    });
  });

  it("parses search input", () => {
    expect(
      parsePaginationInput({
        search: { query: "hello", fields: ["title"] },
      })
    ).toMatchObject({
      search: { query: "hello", fields: ["title"] },
    });
  });

  it("rejects negative pageNumber", () => {
    expect(() =>
      parsePaginationInput({
        mode: "OFFSET",
        pageNumber: -1,
      })
    ).toThrow("pageNumber must be non-negative");
  });
});
