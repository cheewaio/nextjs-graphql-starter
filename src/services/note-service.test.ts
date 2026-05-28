// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { encodeCursor } from "@/lib/cursor";
import { NoteService, type NoteRecord, type NoteRepository } from "@/services/note-service";

function createRepository(seed: NoteRecord[] = []): NoteRepository {
  const records = [...seed];

  return {
    async create(input) {
      const note: NoteRecord = {
        id: `note-${records.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      };
      records.unshift(note);
      return note;
    },
    async findById(id) {
      return records.find((record) => record.id === id) ?? null;
    },
    async listByOwner(ownerUsername) {
      return records.filter((record) => record.ownerUsername === ownerUsername);
    },
    async update(id, input) {
      const record = records.find((item) => item.id === id);

      if (!record) {
        throw new Error("not found");
      }

      Object.assign(record, input, { updatedAt: new Date() });
      return record;
    },
    async delete(id) {
      const index = records.findIndex((record) => record.id === id);

      if (index >= 0) {
        records.splice(index, 1);
      }
    },
  };
}

describe("note service", () => {
  let service: NoteService;

  beforeEach(() => {
    service = new NoteService(
      createRepository([
        {
          id: "note-3",
          ownerUsername: "user@example.com",
          title: "Third",
          content: "Again",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
          updatedAt: new Date("2024-01-03T00:00:00.000Z"),
        },
        {
          id: "note-2",
          ownerUsername: "user@example.com",
          title: "Second",
          content: "World",
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
        },
        {
          id: "note-1",
          ownerUsername: "user@example.com",
          title: "First",
          content: "Hello",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ])
    );
  });

  it("creates and validates notes", async () => {
    await expect(
      service.create("user@example.com", { title: "  ", content: "Body" })
    ).rejects.toThrow("Title is required");

    await expect(
      service.create("user@example.com", { title: "New", content: "Body" })
    ).resolves.toMatchObject({
      ownerUsername: "user@example.com",
      title: "New",
      content: "Body",
    });
  });

  it("enforces ownership on get, update, and delete", async () => {
    await expect(
      service.getById("other@example.com", "note-1")
    ).rejects.toThrow("Note not found");

    await expect(
      service.update("other@example.com", "note-1", { title: "Updated" })
    ).rejects.toThrow("Note not found");

    await expect(
      service.delete("other@example.com", "note-1")
    ).rejects.toThrow("Note not found");
  });

  it("filters and paginates notes", async () => {
    await expect(
      service.list(
        "user@example.com",
        { first: 1, last: 0, after: null, before: null, sort: [] },
        {
          logic: "AND",
          filters: [{ field: "title", operator: "CONTAINS", value: "Sec" }],
        }
      )
    ).resolves.toMatchObject({
      items: [{ id: "note-2" }],
      pageInfo: {
        startCursor: expect.any(String),
        endCursor: expect.any(String),
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const firstPage = await service.list(
      "user@example.com",
      { first: 1, last: 0, after: null, before: null, sort: [] },
      { logic: "AND", filters: [] }
    );

    await expect(
      service.list(
        "user@example.com",
        {
          first: 1,
          last: 0,
          after: {
            id: "note-3",
            sortValues: ["2024-01-03T00:00:00.000Z"],
          },
          before: null,
          sort: [],
        },
        { logic: "AND", filters: [] }
      )
    ).resolves.toMatchObject({
      items: [{ id: "note-2" }],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });

    await expect(
      service.list(
        "user@example.com",
        {
          first: 1,
          last: 0,
          after: { id: "missing", sortValues: ["x"] },
          before: null,
          sort: [],
        },
        { logic: "AND", filters: [] }
      )
    ).rejects.toThrow("Invalid pagination cursor");

    await expect(
      service.list(
        "user@example.com",
        {
          first: 0,
          last: 1,
          after: null,
          before: {
            id: "note-2",
            sortValues: ["2024-01-02T00:00:00.000Z"],
          },
          sort: [],
        },
        { logic: "AND", filters: [] }
      )
    ).resolves.toMatchObject({
      items: [{ id: "note-3" }],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });

    expect(firstPage.pageInfo.startCursor).toBe(
      encodeCursor({
        id: "note-3",
        sortValues: ["2024-01-03T00:00:00.000Z"],
      })
    );
  });

  it("supports explicit sort input", async () => {
    await expect(
      service.list(
        "user@example.com",
        {
          first: 3,
          last: 0,
          after: null,
          before: null,
          sort: [{ field: "title", asc: true }],
        },
        { logic: "AND", filters: [] }
      )
    ).resolves.toMatchObject({
      items: [{ title: "First" }, { title: "Second" }, { title: "Third" }],
    });
  });

  it("uses the active sort direction for tie-breaking", async () => {
    const tieService = new NoteService(
      createRepository([
        {
          id: "note-b",
          ownerUsername: "user@example.com",
          title: "Same",
          content: "B",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
          updatedAt: new Date("2024-01-03T00:00:00.000Z"),
        },
        {
          id: "note-a",
          ownerUsername: "user@example.com",
          title: "Same",
          content: "A",
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
          updatedAt: new Date("2024-01-03T00:00:00.000Z"),
        },
      ])
    );

    await expect(
      tieService.list(
        "user@example.com",
        {
          first: 2,
          last: 0,
          after: null,
          before: null,
          sort: [{ field: "createdAt", asc: false }],
        },
        { logic: "AND", filters: [] }
      )
    ).resolves.toMatchObject({
      items: [{ id: "note-b" }, { id: "note-a" }],
    });

    await expect(
      tieService.list(
        "user@example.com",
        {
          first: 2,
          last: 0,
          after: null,
          before: null,
          sort: [{ field: "createdAt", asc: true }],
        },
        { logic: "AND", filters: [] }
      )
    ).resolves.toMatchObject({
      items: [{ id: "note-a" }, { id: "note-b" }],
    });
  });
});
