// @vitest-environment node

import { describe, expect, it } from "vitest";

import { encodeCursor } from "@/lib/cursor";
import {
  parseFilterInput,
  parsePageInput,
} from "@/graphql/support/query-input";

describe("query input helpers", () => {
  it("applies pagination defaults and size caps", () => {
    expect(parsePageInput()).toEqual({
      first: 10,
      last: 0,
      after: null,
      before: null,
      sort: [],
    });

    expect(parsePageInput({ first: 999 })).toEqual({
      first: 50,
      last: 0,
      after: null,
      before: null,
      sort: [],
    });
  });

  it("parses forward pagination and sort input", () => {
    expect(
      parsePageInput(
        {
          after: encodeCursor({
            id: "note-1",
            sortValues: ["2024-01-01T00:00:00.000Z"],
          }),
          first: 5,
          sort: [{ field: "createdAt", asc: false }],
        },
        ["createdAt"]
      )
    ).toEqual({
      first: 5,
      last: 0,
      after: {
        id: "note-1",
        sortValues: ["2024-01-01T00:00:00.000Z"],
      },
      before: null,
      sort: [{ field: "createdAt", asc: false }],
    });
  });

  it("parses backward pagination input", () => {
    expect(
      parsePageInput({
        before: encodeCursor({
          id: "note-2",
          sortValues: ["2024-01-02T00:00:00.000Z"],
        }),
      })
    ).toEqual({
      first: 0,
      last: 10,
      after: null,
      before: {
        id: "note-2",
        sortValues: ["2024-01-02T00:00:00.000Z"],
      },
      sort: [],
    });
  });

  it("rejects mixed-direction pagination and invalid sort fields", () => {
    expect(() =>
      parsePageInput({
        before: encodeCursor({ id: "note-2", sortValues: ["x"] }),
        first: 1,
      })
    ).toThrow("last must be used with before, not first");

    expect(() =>
      parsePageInput(
        { sort: [{ field: "ownerUsername", asc: true }] },
        ["title"]
      )
    ).toThrow("Unsupported sort field");
  });

  it("rejects invalid cursors", () => {
    expect(() =>
      parsePageInput({ after: "bad-cursor" })
    ).toThrow("Invalid after cursor.");
  });

  it("rejects unsupported filters", () => {
    expect(() =>
      parseFilterInput(
        {
          filters: [{ field: "bogus", operator: "EQ", value: "x" }],
        },
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
});
