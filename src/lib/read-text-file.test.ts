import { describe, expect, it } from "vitest";
import { readTextFile } from "./read-text-file";

function read(...bytes: number[]) {
  return readTextFile(new Blob([new Uint8Array(bytes)]));
}

describe("readTextFile", () => {
  it("UTF-8を読み、先頭のBOMを除く", async () => {
    const result = await readTextFile(new Blob(["﻿首都は？,東京"]));
    expect(result).toEqual({ ok: true, value: "首都は？,東京" });
  });

  it("Shift_JISを読む", async () => {
    // 「日本」のShift_JIS
    expect(await read(0x93, 0xfa, 0x96, 0x7b)).toEqual({
      ok: true,
      value: "日本",
    });
  });

  it("空のファイルは空の文章になる", async () => {
    expect(await read()).toEqual({ ok: true, value: "" });
  });

  it("文章でないファイルを拒否する", async () => {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
    expect((await read(...png)).ok).toBe(false);
    expect((await read(0xff, 0xfe, 0x00, 0x00)).ok).toBe(false);
  });
});
