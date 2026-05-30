export type CursorPayload = {
  id: string;
  sortValues: string[];
};

export function encodeCursor(payload: CursorPayload) {
  const parts: Buffer[] = [];

  const nVals = Buffer.alloc(1);
  nVals.writeUInt8(payload.sortValues.length);
  parts.push(nVals);

  for (const value of payload.sortValues) {
    const valBuf = Buffer.from(value, "utf8");
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(valBuf.length);
    parts.push(lenBuf);
    parts.push(valBuf);
  }

  const idBuf = Buffer.from(payload.id, "utf8");
  const idLenBuf = Buffer.alloc(2);
  idLenBuf.writeUInt16BE(idBuf.length);
  parts.push(idLenBuf);
  parts.push(idBuf);

  return Buffer.concat(parts).toString("base64url").replace(/=+$/, "");
}

export function decodeCursor(cursor: string): CursorPayload {
  const data = Buffer.from(cursor, "base64url");
  let offset = 0;

  if (offset >= data.length) {
    throw new Error("Invalid cursor");
  }
  const nVals = data.readUInt8(offset);
  offset += 1;

  const sortValues: string[] = [];
  for (let i = 0; i < nVals; i++) {
    if (offset + 2 > data.length) {
      throw new Error("Invalid cursor");
    }
    const len = data.readUInt16BE(offset);
    offset += 2;
    if (offset + len > data.length) {
      throw new Error("Invalid cursor");
    }
    sortValues.push(data.toString("utf8", offset, offset + len));
    offset += len;
  }

  if (offset + 2 > data.length) {
    throw new Error("Invalid cursor");
  }
  const idLen = data.readUInt16BE(offset);
  offset += 2;
  if (offset + idLen > data.length) {
    throw new Error("Invalid cursor");
  }
  const id = data.toString("utf8", offset, offset + idLen);

  return { id, sortValues };
}
