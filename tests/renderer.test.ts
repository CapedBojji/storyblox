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
    expect(style.borderRadius).toBe("8px");
  });

  test("collects unsupported class and prop warnings", () => {
    const warnings = collectRendererWarnings({
      className: "ViewportFrame",
      props: { CurrentCamera: "Camera" },
      children: [],
    });

    expect(warnings).toContain("Unsupported class ViewportFrame; rendering its children best-effort.");
    expect(warnings).toContain("Unsupported ViewportFrame.CurrentCamera; property was ignored.");
  });
});
