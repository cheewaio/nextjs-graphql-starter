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

  it("filters and paginates notes in cursor mode", async () => {
    await expect(
      service.list("user@example.com", {
        mode: "CURSOR",
        pageSize: 1,
        pageNumber: 0,
        after: null,
        sort: [],
        search: null,
        filter: {
          logic: "AND",
          filters: [{ field: "title", operator: "CONTAINS", value: "Sec" }],
        },
      })
    ).resolves.toMatchObject({
      items: [{ id: "note-2" }],
      pagination: {
        next: null,
        previous: null,
        total: 1,
      },
    });

    const firstPage = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 1,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    await expect(
      service.list("user@example.com", {
        mode: "CURSOR",
        pageSize: 1,
        pageNumber: 0,
        after: {
          id: "note-3",
          sortValues: ["2024-01-03T00:00:00.000Z"],
        },
        sort: [],
        search: null,
        filter: { logic: "AND", filters: [] },
      })
    ).resolves.toMatchObject({
      items: [{ id: "note-2" }],
      pagination: {
        total: 3,
        next: expect.objectContaining({ pageSize: 1, cursor: expect.any(String) }),
        previous: expect.objectContaining({ pageSize: 1, cursor: expect.any(String) }),
      },
    });

    await expect(
      service.list("user@example.com", {
        mode: "CURSOR",
        pageSize: 1,
        pageNumber: 0,
        after: { id: "missing", sortValues: ["x"] },
        sort: [],
        search: null,
        filter: { logic: "AND", filters: [] },
      })
    ).rejects.toThrow("Invalid pagination cursor");

    expect(firstPage.pagination.next).not.toBeNull();
  });

  it("supports cursor mode pagination after cursor", async () => {
    const firstPage = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 1,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.pagination.total).toBe(3);
    expect(firstPage.pagination.next).not.toBeNull();

    const secondPage = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 1,
      pageNumber: 0,
      after: {
        id: "note-2",
        sortValues: ["2024-01-02T00:00:00.000Z"],
      },
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items![0].id).toBe("note-1");
    expect(secondPage.pagination.previous).not.toBeNull();
    expect(secondPage.pagination.next).toBeNull();
  });

  it("supports offset mode pagination", async () => {
    const firstPage = await service.list("user@example.com", {
      mode: "OFFSET",
      pageSize: 1,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items![0].id).toBe("note-3");
    expect(firstPage.pagination.total).toBe(3);
    expect(firstPage.pagination.next).toMatchObject({ pageSize: 1, pageNumber: 1 });
    expect(firstPage.pagination.previous).toBeNull();

    const secondPage = await service.list("user@example.com", {
      mode: "OFFSET",
      pageSize: 1,
      pageNumber: 1,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items![0].id).toBe("note-2");
    expect(secondPage.pagination.next).toMatchObject({ pageSize: 1, pageNumber: 2 });
    expect(secondPage.pagination.previous).toMatchObject({ pageSize: 1, pageNumber: 0 });
  });

  it("supports explicit sort input", async () => {
    const result = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 3,
      pageNumber: 0,
      after: null,
      sort: [{ field: "title", order: "ASC" }],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(result.items.map((n) => n.title)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
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

    const descResult = await tieService.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 2,
      pageNumber: 0,
      after: null,
      sort: [{ field: "createdAt", order: "DESC" }],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(descResult.items.map((n) => n.id)).toEqual(["note-b", "note-a"]);

    const ascResult = await tieService.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 2,
      pageNumber: 0,
      after: null,
      sort: [{ field: "createdAt", order: "ASC" }],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(ascResult.items.map((n) => n.id)).toEqual(["note-a", "note-b"]);
  });

  it("supports search filtering", async () => {
    const result = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 10,
      pageNumber: 0,
      after: null,
      sort: [{ field: "title", order: "ASC" }],
      search: { query: "hello", fields: [] },
      filter: { logic: "AND", filters: [] },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items![0].id).toBe("note-1");
    expect(result.pagination.total).toBe(1);
  });

  it("encodes cursors in cursor mode response", async () => {
    const result = await service.list("user@example.com", {
      mode: "CURSOR",
      pageSize: 1,
      pageNumber: 0,
      after: null,
      sort: [],
      search: null,
      filter: { logic: "AND", filters: [] },
    });

    expect(result.pagination.next).toMatchObject({
      pageSize: 1,
      cursor: encodeCursor({
        id: "note-3",
        sortValues: ["2024-01-03T00:00:00.000Z"],
      }),
    });
  });
});
