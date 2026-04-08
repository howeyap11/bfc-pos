import { describe, expect, it } from "vitest";
import { resolveInitialHasSizesModeAndSize } from "./posItemInitialSize";

const sm = {
  HOT: [{ id: "12", name: "12oz" }, { id: "16", name: "16oz" }],
  ICED: [{ id: "12", name: "12oz" }, { id: "16", name: "16oz" }],
  CONCENTRATED: [] as { id: string; name: string }[],
};

describe("resolveInitialHasSizesModeAndSize", () => {
  it("uses drinkModeDefaults when defaultSizeOptionId matches ICED default (16oz iced)", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "16",
      sizesByMode: sm,
      drinkModeDefaults: [
        { mode: "HOT", defaultOptionId: "12" },
        { mode: "ICED", defaultOptionId: "16" },
      ],
    });
    expect(r.mode).toBe("ICED");
    expect(r.size).toEqual({ id: "16", name: "16oz" });
  });

  it("uses drinkModeDefaults for 12oz hot", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "12",
      sizesByMode: sm,
      drinkModeDefaults: [
        { mode: "HOT", defaultOptionId: "12" },
        { mode: "ICED", defaultOptionId: "16" },
      ],
    });
    expect(r.mode).toBe("HOT");
    expect(r.size).toEqual({ id: "12", name: "12oz" });
  });

  it("without drinkModeDefaults, same id in HOT+ICED prefers HOT (avoids ICED tie-break when ICED is disabled)", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "16",
      sizesByMode: sm,
    });
    expect(r.mode).toBe("HOT");
    expect(r.size?.id).toBe("16");
  });

  it("invalid default id falls back to first per-mode default then first mode", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "missing",
      sizesByMode: sm,
      drinkModeDefaults: [{ mode: "HOT", defaultOptionId: "12" }],
    });
    expect(r.mode).toBe("HOT");
    expect(r.size).toEqual({ id: "12", name: "12oz" });
  });

  it("combined default by name (e.g. 16oz Iced): id not in sizesByMode, use defaultSizeOptionName", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "combined-16oz-iced-id",
      defaultSizeOptionName: "16oz Iced",
      sizesByMode: sm,
    });
    expect(r.mode).toBe("ICED");
    expect(r.size).toEqual({ id: "16", name: "16oz" });
  });

  it("combined default 12oz Hot opens as HOT + 12oz", () => {
    const r = resolveInitialHasSizesModeAndSize({
      defaultSizeOptionId: "combined-12oz-hot-id",
      defaultSizeOptionName: "12oz Hot",
      sizesByMode: sm,
    });
    expect(r.mode).toBe("HOT");
    expect(r.size).toEqual({ id: "12", name: "12oz" });
  });
});
