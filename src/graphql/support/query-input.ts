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

export type SortFieldInput = {
  field: string;
  asc: boolean;
};

export type PageInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  sort?: SortFieldInput[] | null;
};

export type ParsedSortField = {
  field: string;
  asc: boolean;
};

export type ParsedPageInput = {
  first: number;
  last: number;
  after: CursorPayload | null;
  before: CursorPayload | null;
  sort: ParsedSortField[];
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

const defaultPageSize = 10;
const maxPageSize = 50;

function clamp(value: number) {
  return Math.min(Math.max(value, 1), maxPageSize);
}

function decodePageCursor(cursor: string, label: "after" | "before") {
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

export function parsePageInput(
  input?: PageInput | null,
  supportedSortFields?: readonly string[]
): ParsedPageInput {
  const parsed: ParsedPageInput = {
    first: defaultPageSize,
    last: 0,
    after: null,
    before: null,
    sort: [],
  };

  switch (true) {
    case Boolean(input?.before): {
      const before = input?.before;

      if (input?.after) {
        throw new AppError(
          "after and before cannot be used together",
          400,
          "BAD_USER_INPUT"
        );
      }

      parsed.before = decodePageCursor(before!, "before");

      if (input?.last != null) {
        parsed.last = clamp(input.last);
      } else if (input?.first != null) {
        throw new AppError(
          "last must be used with before, not first",
          400,
          "BAD_USER_INPUT"
        );
      } else {
        parsed.last = defaultPageSize;
      }

      parsed.first = 0;
      break;
    }

    case Boolean(input?.after): {
      const after = input?.after;

      if (input?.before) {
        throw new AppError(
          "after and before cannot be used together",
          400,
          "BAD_USER_INPUT"
        );
      }

      parsed.after = decodePageCursor(after!, "after");

      if (input?.first != null) {
        parsed.first = clamp(input.first);
      } else if (input?.last != null) {
        throw new AppError(
          "first must be used with after, not last",
          400,
          "BAD_USER_INPUT"
        );
      }

      break;
    }

    default: {
      if (input?.first != null) {
        parsed.first = clamp(input.first);
      } else if (input?.last != null) {
        parsed.last = clamp(input.last);
        parsed.first = 0;
      }
      break;
    }
  }

  parsed.sort = (input?.sort ?? []).map((field) => {
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
      asc: field.asc,
    };
  });

  return parsed;
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

      if (!supportedOperators) {
        throw new AppError(
          `Unsupported filter field: ${field}.`,
          400,
          "BAD_USER_INPUT"
        );
      }

      if (!supportedOperators.includes(filter.operator)) {
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
