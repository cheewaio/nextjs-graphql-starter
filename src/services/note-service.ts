import { type PrismaClient } from "@/generated/prisma/client";
import {
  type ParsedFilterInput,
  type ParsedPaginationInput,
  type ParsedSortField,
  type FilterOperator,
  type ParsedSearchInput,
} from "@/graphql/support/query-input";
import { encodeCursor, type CursorPayload } from "@/lib/cursor";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type NoteRecord = {
  id: string;
  ownerUsername: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteRepository = {
  create(input: {
    ownerUsername: string;
    title: string;
    content: string;
  }): Promise<NoteRecord>;
  findById(id: string): Promise<NoteRecord | null>;
  listByOwner(ownerUsername: string): Promise<NoteRecord[]>;
  update(
    id: string,
    input: Partial<Pick<NoteRecord, "title" | "content">>
  ): Promise<NoteRecord>;
  delete(id: string): Promise<void>;
};

export type CursorPageResult = {
  pageSize: number;
  cursor: string;
};

export type OffsetPageResult = {
  pageSize: number;
  pageNumber: number;
};

export type PaginationMetadataResult = {
  next: CursorPageResult | OffsetPageResult | null;
  previous: CursorPageResult | OffsetPageResult | null;
  total: number;
};

export type NoteConnectionResult = {
  items: NoteRecord[];
  pagination: PaginationMetadataResult;
};

const defaultSort: ParsedSortField[] = [{ field: "createdAt", order: "DESC" }];

const fieldAliases: Record<string, keyof NoteRecord> = {
  id: "id",
  title: "title",
  content: "content",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export function createPrismaNoteRepository(
  client: PrismaClient = prisma
): NoteRepository {
  return {
    async create(input) {
      return client.note.create({
        data: input,
      });
    },
    async findById(id) {
      return client.note.findUnique({
        where: { id },
      });
    },
    async listByOwner(ownerUsername) {
      return client.note.findMany({
        where: { ownerUsername },
      });
    },
    async update(id, input) {
      return client.note.update({
        where: { id },
        data: input,
      });
    },
    async delete(id) {
      await client.note.delete({
        where: { id },
      });
    },
  };
}

export type NoteFilterInput = ParsedFilterInput;

function resolveField(field: string) {
  return fieldAliases[field];
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    sensitivity: "base",
  });
}

function sortValue(note: NoteRecord, field: string) {
  const resolved = resolveField(field);

  if (!resolved) {
    return note.id;
  }

  const value = note[resolved];

  if (value instanceof Date) {
    return value.getTime();
  }

  return value;
}

function serializeSortValue(note: NoteRecord, field: string) {
  const resolved = resolveField(field);

  if (!resolved) {
    return "";
  }

  const value = note[resolved];

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function buildCursorPayload(
  note: NoteRecord,
  sort: ParsedSortField[]
): CursorPayload {
  return {
    id: note.id,
    sortValues: sort.map((field) => serializeSortValue(note, field.field)),
  };
}

function cursorEquals(left: CursorPayload, right: CursorPayload) {
  return (
    left.id === right.id &&
    left.sortValues.length === right.sortValues.length &&
    left.sortValues.every((value, index) => value === right.sortValues[index])
  );
}

function compareNotes(
  left: NoteRecord,
  right: NoteRecord,
  sort: ParsedSortField[]
) {
  for (const field of sort) {
    const direction = field.order === "ASC" ? 1 : -1;
    const result = compareValues(
      sortValue(left, field.field),
      sortValue(right, field.field)
    );

    if (result !== 0) {
      return result * direction;
    }
  }

  const tieBreakerDirection = sort.at(-1)?.order === "ASC" ? 1 : -1;
  return left.id.localeCompare(right.id) * tieBreakerDirection;
}

function applyOperator(
  candidate: string | null,
  operator: FilterOperator,
  value: string | null
) {
  switch (operator) {
    case "EQ":
      return candidate === value;
    case "NEQ":
      return candidate !== value;
    case "CONTAINS":
      return (
        candidate?.toLowerCase().includes(value?.toLowerCase() ?? "") ?? false
      );
    case "IS_NULL":
      return candidate === null;
    case "IS_NOT_NULL":
      return candidate !== null;
    default:
      return false;
  }
}

function filterFieldValue(note: NoteRecord, field: string) {
  const resolved = resolveField(field);
  const value = resolved ? note[resolved] : null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" ? value : null;
}

function applySearch(note: NoteRecord, search: ParsedSearchInput) {
  const query = search.query.toLowerCase();
  const fields = search.fields.length > 0 ? search.fields : ["title", "content"];

  return fields.some((field) => {
    const value = filterFieldValue(note, field);
    return value?.toLowerCase().includes(query) ?? false;
  });
}

function sanitizeCreateInput(input: { title: string; content: string }) {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) {
    throw new AppError("Title is required.", 400, "BAD_USER_INPUT");
  }

  if (!content) {
    throw new AppError("Content is required.", 400, "BAD_USER_INPUT");
  }

  return { title, content };
}

function sanitizeUpdateInput(input: { title?: string | null; content?: string | null }) {
  const next: { title?: string; content?: string } = {};

  if (input.title !== undefined) {
    if (input.title === null) {
      throw new AppError("Title cannot be empty.", 400, "BAD_USER_INPUT");
    }

    const title = input.title.trim();

    if (!title) {
      throw new AppError("Title cannot be empty.", 400, "BAD_USER_INPUT");
    }

    next.title = title;
  }

  if (input.content !== undefined) {
    if (input.content === null) {
      throw new AppError("Content cannot be empty.", 400, "BAD_USER_INPUT");
    }

    const content = input.content.trim();

    if (!content) {
      throw new AppError("Content cannot be empty.", 400, "BAD_USER_INPUT");
    }

    next.content = content;
  }

  if (!next.title && !next.content) {
    throw new AppError(
      "At least one field must be provided for update.",
      400,
      "BAD_USER_INPUT"
    );
  }

  return next;
}

async function getOwnedNote(
  repository: NoteRepository,
  ownerUsername: string,
  id: string
) {
  const note = await repository.findById(id);

  if (!note || note.ownerUsername !== ownerUsername) {
    throw new AppError("Note not found.", 404, "NOT_FOUND");
  }

  return note;
}

function findCursorIndex(
  notes: NoteRecord[],
  cursor: CursorPayload,
  sort: ParsedSortField[]
) {
  return notes.findIndex((note) =>
    cursorEquals(buildCursorPayload(note, sort), cursor)
  );
}

export class NoteService {
  constructor(private repository: NoteRepository = createPrismaNoteRepository()) {}

  async create(
    ownerUsername: string,
    input: { title: string; content: string }
  ) {
    const clean = sanitizeCreateInput(input);

    return this.repository.create({
      ownerUsername,
      ...clean,
    });
  }

  async getById(ownerUsername: string, id: string) {
    return getOwnedNote(this.repository, ownerUsername, id);
  }

  async update(
    ownerUsername: string,
    id: string,
    input: { title?: string | null; content?: string | null }
  ) {
    await getOwnedNote(this.repository, ownerUsername, id);

    return this.repository.update(id, sanitizeUpdateInput(input));
  }

  async delete(ownerUsername: string, id: string) {
    await getOwnedNote(this.repository, ownerUsername, id);
    await this.repository.delete(id);
  }

  async list(
    ownerUsername: string,
    page: ParsedPaginationInput
  ): Promise<NoteConnectionResult> {
    const sort = page.sort.length > 0 ? page.sort : defaultSort;
    const notes = await this.repository.listByOwner(ownerUsername);

    let filtered = notes;

    if (page.search) {
      filtered = filtered.filter((note) => applySearch(note, page.search!));
    }

    if (page.filter.filters.length > 0) {
      filtered = filtered.filter((note) => {
        const matches = page.filter.filters.map((item) =>
          applyOperator(
            filterFieldValue(note, item.field),
            item.operator,
            item.value
          )
        );

        return page.filter.logic === "AND"
          ? matches.every(Boolean)
          : matches.some(Boolean);
      });
    }

    filtered.sort((left, right) => compareNotes(left, right, sort));

    const total = filtered.length;

    if (page.mode === "OFFSET") {
      const startIndex = page.pageNumber * page.pageSize;
      const endIndex = Math.min(total, startIndex + page.pageSize);
      const items = filtered.slice(startIndex, endIndex);

      const hasNext = endIndex < total;
      const hasPrev = page.pageNumber > 0;

      return {
        items,
        pagination: {
          next: hasNext
            ? { pageSize: page.pageSize, pageNumber: page.pageNumber + 1 }
            : null,
          previous: hasPrev
            ? { pageSize: page.pageSize, pageNumber: page.pageNumber - 1 }
            : null,
          total,
        },
      };
    }

    let startIndex = 0;
    let endIndex = total;

    if (page.after) {
      const index = findCursorIndex(filtered, page.after, sort);

      if (index < 0) {
        throw new AppError("Invalid pagination cursor.", 400, "BAD_USER_INPUT");
      }

      startIndex = index + 1;
      endIndex = Math.min(total, startIndex + page.pageSize);
    } else {
      endIndex = Math.min(total, page.pageSize);
    }

    const items = filtered.slice(startIndex, endIndex);

    return {
      items,
      pagination: {
        next: endIndex < total
          ? {
              pageSize: page.pageSize,
              cursor: encodeCursor(buildCursorPayload(items.at(-1)!, sort)),
            }
          : null,
        previous: startIndex > 0
          ? {
              pageSize: page.pageSize,
              cursor: encodeCursor(buildCursorPayload(items[0], sort)),
            }
          : null,
        total,
      },
    };
  }
}
