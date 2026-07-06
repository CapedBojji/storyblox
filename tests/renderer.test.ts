import { describe, expect, test } from "vitest";
import type { RobloxVNode } from "../src/shared/types.js";
import { collectModifiers, color3ToHex, createNodeStyle, hexToColor3, udimToCss } from "../src/client/renderer/style.js";
import { collectRendererWarnings } from "../src/client/renderer/warnings.js";

describe("renderer style helpers", () => {
  test("converts Roblox datatypes to CSS", () => {
    expect(udimToCss({ $type: "UDim", scale: 0, offset: 12 })).toBe("12px");
    expect(udimToCss({ $type: "UDim", scale: 0.5, offset: 10 })).toBe("calc(50% + 10px)");
    expect(color3ToHex({ $type: "Color3", r: 1, g: 0.5, b: 0 })).toBe("#ff8000");
    expect(hexToColor3("#336699")).toEqual({
      $type: "Color3",
      r: 0.2,
      g: 0.4,
      b: 0.6,
    });
  });

  test("applies modifiers to node style", () => {
    const node: RobloxVNode = {
      className: "Frame",
      props: {
        Size: {
          $type: "UDim2",
          x: { $type: "UDim", scale: 0, offset: 100 },
          y: { $type: "UDim", scale: 0, offset: 50 },
        },
        BackgroundColor3: { $type: "Color3", r: 1, g: 1, b: 1 },
      },
      children: [
        {
          className: "UICorner",
          props: { CornerRadius: { $type: "UDim", scale: 0, offset: 8 } },
          children: [],
        },
      ],
    };

    const style = createNodeStyle(node, collectModifiers(node.children));
    expect(style.width).toBe("100px");
    expect(style.height).toBe("50px");
    expect(style.borderRadius).toBe("8px 8px 8px 8px");
    expect(style.border).toBe("1px solid rgb(27, 42, 53)");
  });

  test("applies grid, scale, and size constraint modifiers", () => {
    const node: RobloxVNode = {
      className: "Frame",
      props: {},
      children: [
        {
          className: "UIGridLayout",
          props: {
            CellSize: {
              $type: "UDim2",
              x: { $type: "UDim", scale: 0, offset: 72 },
              y: { $type: "UDim", scale: 0, offset: 40 },
            },
            CellPadding: {
              $type: "UDim2",
              x: { $type: "UDim", scale: 0, offset: 8 },
              y: { $type: "UDim", scale: 0, offset: 6 },
            },
            FillDirectionMaxCells: 3,
          },
          children: [],
        },
        {
          className: "UIScale",
          props: { Scale: 0.8 },
          children: [],
        },
        {
          className: "UISizeConstraint",
          props: {
            MinSize: { $type: "Vector2", x: 120, y: 80 },
            MaxSize: { $type: "Vector2", x: 420, y: 300 },
          },
          children: [],
        },
      ],
    };

    const style = createNodeStyle(node, collectModifiers(node.children));
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe("repeat(3, minmax(0, 72px))");
    expect(style.gridAutoRows).toBe("40px");
    expect(style.columnGap).toBe("8px");
    expect(style.rowGap).toBe("6px");
    expect(style.transform).toBe("scale(0.8)");
    expect(style.minWidth).toBe("120px");
    expect(style.maxHeight).toBe("300px");
  });

  test("applies UIFlexItem to nodes inside layouts", () => {
    const node: RobloxVNode = {
      className: "Frame",
      props: {},
      children: [
        {
          className: "UIFlexItem",
          props: {
            FlexMode: { $type: "EnumItem", enumType: "UIFlexMode", name: "Custom" },
            GrowRatio: 2,
            ShrinkRatio: 0.5,
            ItemLineAlignment: { $type: "EnumItem", enumType: "ItemLineAlignment", name: "Center" },
          },
          children: [],
        },
      ],
    };

    const style = createNodeStyle(node, collectModifiers(node.children), true);
    expect(style.flexGrow).toBe(2);
    expect(style.flexShrink).toBe(0.5);
    expect(style.alignSelf).toBe("center");
  });

  test("uses Roblox-like text defaults", async () => {
    const { createTextStyle } = await import("../src/client/renderer/style.js");
    const style = createTextStyle({
      className: "TextButton",
      props: {},
      children: [],
    });

    expect(style.textAlign).toBe("center");
    expect(style.justifyContent).toBe("center");
    expect(style.alignItems).toBe("center");
    expect(style.fontFamily).toContain("Arial");
    expect(style.fontSize).toBe("14px");
  });

  test("collects unsupported class and prop warnings", () => {
    const warnings = collectRendererWarnings({
      className: "ParticleEmitter",
      props: { Texture: "rbxassetid://texture" },
      children: [],
    });

    expect(warnings).toContain("Unsupported class ParticleEmitter; rendering its children best-effort.");
    expect(warnings).toContain("Unsupported ParticleEmitter.Texture; property was ignored.");
  });
});
