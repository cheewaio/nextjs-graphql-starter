// @vitest-environment node

import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  mutationFailure,
  mutationSuccess,
} from "@/graphql/support/mutation-response";

describe("mutation response helpers", () => {
  it("builds success envelopes", () => {
    expect(mutationSuccess({ note: { id: "1" } }, "created")).toEqual({
      code: 200,
      success: true,
      message: "created",
      note: { id: "1" },
    });
  });

  it("builds failure envelopes from app errors", () => {
    expect(
      mutationFailure({ note: null }, new AppError("bad input", 400))
    ).toEqual({
      code: 400,
      success: false,
      message: "bad input",
      note: null,
    });
  });
});
