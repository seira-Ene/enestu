import { describe, expect, it } from "vitest";
import { fitSize } from "./image-size";

describe("fitSize", () => {
  it.each([
    ["横長", 4000, 3000, 1600, 1200],
    ["縦長", 3000, 4000, 1200, 1600],
    ["正方形", 3200, 3200, 1600, 1600],
    ["ちょうど", 1600, 900, 1600, 900],
    ["小さい", 300, 200, 300, 200],
    ["極端に細長い", 100_000, 1, 1600, 1],
  ])("%s", (_label, width, height, outWidth, outHeight) => {
    expect(fitSize({ width, height }, 1600)).toEqual({
      width: outWidth,
      height: outHeight,
    });
  });
});
