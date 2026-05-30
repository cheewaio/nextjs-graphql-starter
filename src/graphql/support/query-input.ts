import { decodeCursor, type CursorPayload } from "@/lib/cursor";
import { AppError } from "@/lib/errors";

export type FilterOperator =
  | "EQ"
  | "NEQ"
  | "CONTAINS"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IS_NULL"
  | "IS_NOT_NULL";

export type FilterLogic = "AND" | "OR";

export type FilterCriteriaInput = {
  field: string;
  operator: FilterOperator;
  value?: string | null;
};

export type FilterInput = {
  filters?: FilterCriteriaInput[] | null;
  logic?: FilterLogic | null;
};

export type SortOrder = "ASC" | "DESC";

export type SortFieldInput = {
  field: string;
  order?: SortOrder | null;
};

export type SearchInput = {
  query: string;
  fields?: string[] | null;
};

export type PaginationInput = {
  mode?: "CURSOR" | "OFFSET" | null;
  pageSize?: number | null;
  pageNumber?: number | null;
  cursor?: string | null;
  search?: SearchInput | null;
  sort?: SortFieldInput[] | null;
  filter?: FilterInput | null;
};

export type ParsedSortField = {
  field: string;
  order: SortOrder;
};

export type ParsedSearchInput = {
  query: string;
  fields: string[];
};

export type ParsedPaginationInput = {
  mode: "CURSOR" | "OFFSET";
  pageSize: number;
  pageNumber: number;
  after: CursorPayload | null;
  sort: ParsedSortField[];
  search: ParsedSearchInput | null;
  filter: ParsedFilterInput;
};

export type ParsedFilter = {
  field: string;
  operator: FilterOperator;
  value: string | null;
};

export type ParsedFilterInput = {
  filters: ParsedFilter[];
  logic: FilterLogic;
};

const defaultPageSize = 20;
const maxPageSize = 100;

function clamp(value: number) {
  return Math.min(Math.max(value, 1), maxPageSize);
}

function decodePageCursor(cursor: string, label: string) {
  try {
    return decodeCursor(cursor);
  } catch {
    throw new AppError(
      `Invalid ${label} cursor.`,
      400,
      "BAD_USER_INPUT"
    );
  }
}

export function parsePaginationInput(
  input?: PaginationInput | null,
  supportedSortFields?: readonly string[],
  supportedFilterFields?: Record<string, FilterOperator[]>
): ParsedPaginationInput {
  const mode = input?.mode ?? "CURSOR";
  const pageSize = input?.pageSize != null ? clamp(input.pageSize) : defaultPageSize;

  let pageNumber = 0;
  let after: CursorPayload | null = null;

  if (mode === "OFFSET") {
    pageNumber = input?.pageNumber ?? 0;

    if (pageNumber < 0) {
      throw new AppError("pageNumber must be non-negative.", 400, "BAD_USER_INPUT");
    }

    if (input?.cursor) {
      throw new AppError(
        "cursor cannot be used with OFFSET mode.",
        400,
        "BAD_USER_INPUT"
      );
    }
  } else {
    if (input?.pageNumber != null) {
      throw new AppError(
        "pageNumber cannot be used with CURSOR mode.",
        400,
        "BAD_USER_INPUT"
      );
    }

    if (input?.cursor) {
      after = decodePageCursor(input.cursor, "after");
    }
  }

  const sort: ParsedSortField[] = (input?.sort ?? []).map((field) => {
    const normalizedField = field.field.trim();

    if (!normalizedField) {
      throw new AppError("Sort field is required.", 400, "BAD_USER_INPUT");
    }

    if (
      supportedSortFields &&
      !supportedSortFields.includes(normalizedField)
    ) {
      throw new AppError(
        `Unsupported sort field: ${normalizedField}.`,
        400,
        "BAD_USER_INPUT"
      );
    }

    return {
      field: normalizedField,
      order: field.order ?? "ASC",
    };
  });

  const search: ParsedSearchInput | null = input?.search
    ? {
        query: input.search.query.trim(),
        fields: input.search.fields ?? [],
      }
    : null;

  const filter = parseFilterInput(input?.filter ?? null, supportedFilterFields ?? {});

  return {
    mode: mode as "CURSOR" | "OFFSET",
    pageSize,
    pageNumber,
    after,
    sort,
    search,
    filter,
  };
}

export function parseFilterInput(
  input: FilterInput | null | undefined,
  supportedFields: Record<string, FilterOperator[]>
): ParsedFilterInput {
  const logic = input?.logic ?? "AND";
  const filters = input?.filters ?? [];

  return {
    logic,
    filters: filters.map((filter) => {
      const field = filter.field.trim();
      const supportedOperators = supportedFields[field];

      if (
        Object.keys(supportedFields).length > 0 &&
        !supportedOperators
      ) {
        throw new AppError(
          `Unsupported filter field: ${field}.`,
          400,
          "BAD_USER_INPUT"
        );
      }

      if (
        supportedOperators &&
        !supportedOperators.includes(filter.operator)
      ) {
        throw new AppError(
          `Unsupported operator ${filter.operator} for ${field}.`,
          400,
          "BAD_USER_INPUT"
        );
      }

      if (
        !["IS_NULL", "IS_NOT_NULL"].includes(filter.operator) &&
        !filter.value?.trim()
      ) {
        throw new AppError(
          `Filter ${field} requires a value.`,
          400,
          "BAD_USER_INPUT"
        );
      }

      return {
        field,
        operator: filter.operator,
        value: filter.value?.trim() ?? null,
      };
    }),
  };
}
