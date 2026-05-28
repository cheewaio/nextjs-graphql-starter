export type CursorPayload = {
  id: string;
  sortValues: string[];
};

export function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload {
  const parsed = JSON.parse(
    Buffer.from(cursor, "base64url").toString("utf8")
  ) as Partial<CursorPayload>;

  if (
    !parsed ||
    typeof parsed.id !== "string" ||
    !Array.isArray(parsed.sortValues) ||
    !parsed.sortValues.every((value) => typeof value === "string")
  ) {
    throw new Error("Invalid cursor");
  }

  return {
    id: parsed.id,
    sortValues: parsed.sortValues,
  };
}
