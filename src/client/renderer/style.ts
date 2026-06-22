import type {
  JsonValue,
  RobloxColor3,
  RobloxSerializedValue,
  RobloxUDim,
  RobloxUDim2,
  RobloxVector2,
  RobloxVNode,
} from "../../shared/types";
import type { CSSProperties } from "react";

export interface RobloxModifiers {
  cornerRadius?: string;
  stroke?: {
    color: string;
    thickness: number;
    transparency: number;
  };
  padding?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  listLayout?: {
    direction: "row" | "column";
    gap: string;
    horizontal: string;
    vertical: string;
  };
  gradient?: string;
  aspectRatio?: number;
}

const VISUAL_DEFAULT_SIZE = "100%";

export function collectModifiers(children: RobloxVNode[]): RobloxModifiers {
  const modifiers: RobloxModifiers = {};

  for (const child of children) {
    if (child.className === "UICorner") {
      modifiers.cornerRadius = udimToCss(child.props.CornerRadius, "0px");
    }

    if (child.className === "UIStroke") {
      modifiers.stroke = {
        color: colorToCss(child.props.Color, "#000000"),
        thickness: numeric(child.props.Thickness, 1),
        transparency: numeric(child.props.Transparency, 0),
      };
    }

    if (child.className === "UIPadding") {
      modifiers.padding = {
        top: udimToCss(child.props.PaddingTop, "0px"),
        right: udimToCss(child.props.PaddingRight, "0px"),
        bottom: udimToCss(child.props.PaddingBottom, "0px"),
        left: udimToCss(child.props.PaddingLeft, "0px"),
      };
    }

    if (child.className === "UIListLayout") {
      modifiers.listLayout = {
        direction: enumName(child.props.FillDirection) === "Horizontal" ? "row" : "column",
        gap: udimToCss(child.props.Padding, "0px"),
        horizontal: enumName(child.props.HorizontalAlignment) ?? "Left",
        vertical: enumName(child.props.VerticalAlignment) ?? "Top",
      };
    }

    if (child.className === "UIGradient") {
      const color = colorSequenceToCss(child.props.Color);
      if (color) modifiers.gradient = color;
    }

    if (child.className === "UIAspectRatioConstraint") {
      modifiers.aspectRatio = numeric(child.props.AspectRatio, 1);
    }
  }

  return modifiers;
}

export function createNodeStyle(
  node: RobloxVNode,
  modifiers: RobloxModifiers,
  parentHasLayout = false,
  isRoot = false,
): CSSProperties {
  const props = node.props;
  const size = toUDim2(props.Size);
  const position = toUDim2(props.Position);
  const anchor = toVector2(props.AnchorPoint);
  const transparency = numeric(props.BackgroundTransparency, 0);
  const borderSize = numeric(props.BorderSizePixel, 0);
  const style: CSSProperties = {
    boxSizing: "border-box",
    overflow: node.className === "ScrollingFrame" ? "auto" : "hidden",
    zIndex: numeric(props.ZIndex, 1),
    opacity: numeric(props.Visible, true) === false ? 0 : 1,
  };

  if (isRoot) {
    style.position = "relative";
    style.width = size ? udimToCss(size.x, VISUAL_DEFAULT_SIZE) : "100%";
    style.height = size ? udimToCss(size.y, VISUAL_DEFAULT_SIZE) : "100%";
  } else if (parentHasLayout) {
    style.position = "relative";
    style.flex = "0 0 auto";
    if (size) {
      style.width = udimToCss(size.x, "auto");
      style.height = udimToCss(size.y, "auto");
    }
  } else {
    style.position = "absolute";
    if (size) {
      style.width = udimToCss(size.x, "auto");
      style.height = udimToCss(size.y, "auto");
    }
    if (position) {
      style.left = udimToCss(position.x, "0px");
      style.top = udimToCss(position.y, "0px");
    }
    if (anchor) {
      style.transform = `translate(${-anchor.x * 100}%, ${-anchor.y * 100}%)`;
    }
  }

  if (node.className !== "TextLabel" || numeric(props.BackgroundTransparency, 1) < 1) {
    style.background = colorToCss(props.BackgroundColor3, "transparent", 1 - transparency);
  }

  if (modifiers.gradient) {
    style.background = modifiers.gradient;
  }

  if (modifiers.cornerRadius) {
    style.borderRadius = modifiers.cornerRadius;
  }

  if (borderSize > 0) {
    style.border = `${borderSize}px solid ${colorToCss(props.BorderColor3, "#000000")}`;
  }

  if (modifiers.stroke) {
    style.outline = `${modifiers.stroke.thickness}px solid ${withAlpha(
      modifiers.stroke.color,
      1 - modifiers.stroke.transparency,
    )}`;
    style.outlineOffset = `-${modifiers.stroke.thickness}px`;
  }

  if (modifiers.padding) {
    style.paddingTop = modifiers.padding.top;
    style.paddingRight = modifiers.padding.right;
    style.paddingBottom = modifiers.padding.bottom;
    style.paddingLeft = modifiers.padding.left;
  }

  if (modifiers.listLayout) {
    style.display = "flex";
    style.flexDirection = modifiers.listLayout.direction;
    style.gap = modifiers.listLayout.gap;
    style.justifyContent = alignmentToJustify(modifiers.listLayout.horizontal);
    style.alignItems = alignmentToItems(modifiers.listLayout.vertical);
  }

  if (modifiers.aspectRatio) {
    style.aspectRatio = String(modifiers.aspectRatio);
  }

  return style;
}

export function createTextStyle(node: RobloxVNode): CSSProperties {
  const props = node.props;
  const textTransparency = numeric(props.TextTransparency, 0);

  return {
    color: colorToCss(props.TextColor3, "#111827", 1 - textTransparency),
    fontSize: `${numeric(props.TextSize, 16)}px`,
    fontWeight: enumName(props.Font) === "Bold" ? 700 : 500,
    textAlign: textXAlignmentToCss(enumName(props.TextXAlignment)),
    alignItems: textYAlignmentToCss(enumName(props.TextYAlignment)),
    whiteSpace: props.TextWrapped === true ? "normal" : "nowrap",
    lineHeight: 1.2,
  };
}

export function udimToCss(value: RobloxSerializedValue | undefined, fallback = "0px"): string {
  const udim = toUDim(value);
  if (!udim) return fallback;

  if (udim.scale !== 0 && udim.offset !== 0) {
    return `calc(${udim.scale * 100}% + ${udim.offset}px)`;
  }

  if (udim.scale !== 0) {
    return `${udim.scale * 100}%`;
  }

  return `${udim.offset}px`;
}

export function colorToCss(
  value: RobloxSerializedValue | undefined,
  fallback = "#000000",
  alpha = 1,
): string {
  const color = toColor3(value);
  if (!color) return fallback;

  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255,
  )}, ${clamp(alpha, 0, 1)})`;
}

export function color3ToHex(value: JsonValue | undefined): string {
  const color = toColor3(value as RobloxSerializedValue | undefined);
  if (!color) return "#ffffff";

  const parts = [color.r, color.g, color.b].map((channel) =>
    Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0"),
  );

  return `#${parts.join("")}`;
}

export function hexToColor3(value: string): RobloxColor3 {
  const normalized = value.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  return { $type: "Color3", r, g, b };
}

export function enumName(value: RobloxSerializedValue | undefined): string | undefined {
  if (isRecord(value) && value.$type === "EnumItem" && typeof value.name === "string") {
    return value.name;
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function colorSequenceToCss(value: RobloxSerializedValue | undefined): string | undefined {
  if (!isRecord(value) || value.$type !== "ColorSequence" || !Array.isArray(value.keypoints)) {
    return undefined;
  }

  const stops = value.keypoints
    .map((keypoint) => {
      if (!isRecord(keypoint)) return null;
      return `${colorToCss(keypoint.value as RobloxSerializedValue, "#000000")} ${
        numeric(keypoint.time, 0) * 100
      }%`;
    })
    .filter(Boolean);

  return stops.length > 0 ? `linear-gradient(90deg, ${stops.join(", ")})` : undefined;
}

function toUDim2(value: RobloxSerializedValue | undefined): RobloxUDim2 | undefined {
  return isRecord(value) && value.$type === "UDim2" ? (value as unknown as RobloxUDim2) : undefined;
}

function toUDim(value: RobloxSerializedValue | undefined): RobloxUDim | undefined {
  return isRecord(value) && value.$type === "UDim" ? (value as unknown as RobloxUDim) : undefined;
}

function toColor3(value: RobloxSerializedValue | undefined): RobloxColor3 | undefined {
  return isRecord(value) && value.$type === "Color3" ? (value as unknown as RobloxColor3) : undefined;
}

function toVector2(value: RobloxSerializedValue | undefined): RobloxVector2 | undefined {
  return isRecord(value) && value.$type === "Vector2"
    ? (value as unknown as RobloxVector2)
    : undefined;
}

export function numeric(value: RobloxSerializedValue | undefined, fallback: number): number;
export function numeric(value: RobloxSerializedValue | undefined, fallback: boolean): number | boolean;
export function numeric(
  value: RobloxSerializedValue | undefined,
  fallback: number | boolean,
): number | boolean {
  return typeof value === "number" || typeof value === "boolean" ? value : fallback;
}

function textXAlignmentToCss(value: string | undefined): CSSProperties["textAlign"] {
  if (value === "Right") return "right";
  if (value === "Center") return "center";
  return "left";
}

function textYAlignmentToCss(value: string | undefined): CSSProperties["alignItems"] {
  if (value === "Bottom") return "flex-end";
  if (value === "Center") return "center";
  return "flex-start";
}

function alignmentToJustify(value: string | undefined): CSSProperties["justifyContent"] {
  if (value === "Right") return "flex-end";
  if (value === "Center") return "center";
  return "flex-start";
}

function alignmentToItems(value: string | undefined): CSSProperties["alignItems"] {
  if (value === "Bottom") return "flex-end";
  if (value === "Center") return "center";
  return "flex-start";
}

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("rgba(")) return color;
  return color.replace(/,\s*[\d.]+\)$/, `, ${clamp(alpha, 0, 1)})`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
