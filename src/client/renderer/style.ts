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

export const ROOT_INSTANCE_PATH = "0";

/* Modifier instances configure their parent (corner, stroke, layout, ...) and
   are never rendered as DOM nodes themselves. */
export const MODIFIER_CLASSES = new Set([
  "UICorner",
  "UIStroke",
  "UIPadding",
  "UIListLayout",
  "UIGridLayout",
  "UIPageLayout",
  "UITableLayout",
  "UIGradient",
  "UIAspectRatioConstraint",
  "UISizeConstraint",
  "UITextSizeConstraint",
  "UIScale",
  "UIFlexItem",
  "UIDragDetector",
]);

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
    horizontalFlex?: string | undefined;
    verticalFlex?: string | undefined;
    itemLineAlignment?: string | undefined;
    wraps: boolean;
  };
  gridLayout?: {
    cellWidth: string;
    cellHeight: string;
    gapX: string;
    gapY: string;
    horizontal: string;
    vertical: string;
    maxCells?: number | undefined;
  };
  tableLayout?: {
    gapX: string;
    gapY: string;
    horizontal: string;
    vertical: string;
  };
  pageLayout?: {
    direction: "row" | "column";
    gap: string;
    horizontal: string;
    vertical: string;
  };
  gradient?: string;
  aspectRatio?: number;
  sizeConstraint?: {
    minWidth?: number | undefined;
    minHeight?: number | undefined;
    maxWidth?: number | undefined;
    maxHeight?: number | undefined;
  };
  textSizeConstraint?: {
    min?: number | undefined;
    max?: number | undefined;
  };
  scale?: number;
  flexItem?: {
    mode?: string | undefined;
    growRatio: number;
    shrinkRatio: number;
    itemLineAlignment?: string | undefined;
  };
}

const VISUAL_DEFAULT_SIZE = "100%";
const ROBLOX_DEFAULT_BACKGROUND = { r: 163, g: 162, b: 165 };
const ROBLOX_DEFAULT_BORDER = "rgb(27, 42, 53)";
const ROBLOX_DEFAULT_TEXT = "rgb(27, 42, 53)";
const ROBLOX_FONT_STACK = "Arial, Helvetica, sans-serif";

export function collectModifiers(children: RobloxVNode[]): RobloxModifiers {
  const modifiers: RobloxModifiers = {};

  for (const child of children) {
    if (child.className === "UICorner") {
      const radius = child.props.CornerRadius;
      modifiers.cornerRadius = [
        udimToCss(child.props.TopLeftRadius ?? radius, "0px"),
        udimToCss(child.props.TopRightRadius ?? radius, "0px"),
        udimToCss(child.props.BottomRightRadius ?? radius, "0px"),
        udimToCss(child.props.BottomLeftRadius ?? radius, "0px"),
      ].join(" ");
    }

    if (child.className === "UIStroke" && child.props.Enabled !== false) {
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
        horizontalFlex: enumName(child.props.HorizontalFlex),
        verticalFlex: enumName(child.props.VerticalFlex),
        itemLineAlignment: enumName(child.props.ItemLineAlignment),
        wraps: child.props.Wraps === true,
      };
    }

    if (child.className === "UIGridLayout") {
      const cellSize = toUDim2(child.props.CellSize);
      const cellPadding = toUDim2(child.props.CellPadding);
      modifiers.gridLayout = {
        cellWidth: cellSize ? udimToCss(cellSize.x, "100px") : "100px",
        cellHeight: cellSize ? udimToCss(cellSize.y, "100px") : "100px",
        gapX: cellPadding ? udimToCss(cellPadding.x, "0px") : "0px",
        gapY: cellPadding ? udimToCss(cellPadding.y, "0px") : "0px",
        horizontal: enumName(child.props.HorizontalAlignment) ?? "Left",
        vertical: enumName(child.props.VerticalAlignment) ?? "Top",
        maxCells:
          typeof child.props.FillDirectionMaxCells === "number"
            ? child.props.FillDirectionMaxCells
            : undefined,
      };
    }

    if (child.className === "UITableLayout") {
      const padding = toUDim2(child.props.Padding);
      modifiers.tableLayout = {
        gapX: padding ? udimToCss(padding.x, "0px") : "0px",
        gapY: padding ? udimToCss(padding.y, "0px") : "0px",
        horizontal: enumName(child.props.HorizontalAlignment) ?? "Left",
        vertical: enumName(child.props.VerticalAlignment) ?? "Top",
      };
    }

    if (child.className === "UIPageLayout") {
      modifiers.pageLayout = {
        direction: enumName(child.props.FillDirection) === "Vertical" ? "column" : "row",
        gap: udimToCss(child.props.Padding, "0px"),
        horizontal: enumName(child.props.HorizontalAlignment) ?? "Left",
        vertical: enumName(child.props.VerticalAlignment) ?? "Top",
      };
    }

    if (child.className === "UIGradient" && child.props.Enabled !== false) {
      const color = colorSequenceToCss(child.props.Color, numeric(child.props.Rotation, 0));
      if (color) modifiers.gradient = color;
    }

    if (child.className === "UIAspectRatioConstraint") {
      modifiers.aspectRatio = numeric(child.props.AspectRatio, 1);
    }

    if (child.className === "UISizeConstraint") {
      const min = toVector2(child.props.MinSize);
      const max = toVector2(child.props.MaxSize);
      modifiers.sizeConstraint = {
        minWidth: min?.x,
        minHeight: min?.y,
        maxWidth: max?.x,
        maxHeight: max?.y,
      };
    }

    if (child.className === "UITextSizeConstraint") {
      modifiers.textSizeConstraint = {
        min:
          typeof child.props.MinTextSize === "number" ? child.props.MinTextSize : undefined,
        max:
          typeof child.props.MaxTextSize === "number" ? child.props.MaxTextSize : undefined,
      };
    }

    if (child.className === "UIScale") {
      modifiers.scale = numeric(child.props.Scale, 1);
    }

    if (child.className === "UIFlexItem") {
      modifiers.flexItem = {
        mode: enumName(child.props.FlexMode),
        growRatio: numeric(child.props.GrowRatio, 0),
        shrinkRatio: numeric(child.props.ShrinkRatio, 1),
        itemLineAlignment: enumName(child.props.ItemLineAlignment),
      };
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
  const borderSize = numeric(props.BorderSizePixel, defaultBorderSize(node.className));
  const groupTransparency =
    node.className === "CanvasGroup" ? numeric(props.GroupTransparency, 0) : 0;
  const transforms: string[] = [];
  const style: CSSProperties = {
    boxSizing: "border-box",
    overflow: node.className === "ScrollingFrame" ? "auto" : "hidden",
    zIndex: numeric(props.ZIndex, 1),
    opacity: numeric(props.Visible, true) === false ? 0 : clamp(1 - groupTransparency, 0, 1),
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
      transforms.push(`translate(${-anchor.x * 100}%, ${-anchor.y * 100}%)`);
    }
  }

  const rotation = numeric(props.Rotation, 0);
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }

  if (modifiers.scale !== undefined && modifiers.scale !== 1) {
    transforms.push(`scale(${modifiers.scale})`);
  }

  if (transforms.length > 0) {
    style.transform = transforms.join(" ");
  }

  style.background = colorToCss(
    props.BackgroundColor3,
    defaultBackgroundColor(node.className, 1 - transparency),
    1 - transparency,
  );

  if (modifiers.gradient) {
    style.background = modifiers.gradient;
  }

  if (modifiers.cornerRadius) {
    style.borderRadius = modifiers.cornerRadius;
  }

  if (borderSize > 0) {
    style.border = `${borderSize}px solid ${colorToCss(props.BorderColor3, ROBLOX_DEFAULT_BORDER)}`;
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
    style.flexWrap = modifiers.listLayout.wraps ? "wrap" : "nowrap";
    style.justifyContent = listMainAlignment(modifiers.listLayout);
    style.alignItems = listCrossAlignment(modifiers.listLayout);
    style.alignContent = lineAlignmentToContent(modifiers.listLayout.itemLineAlignment);
  }

  if (modifiers.gridLayout) {
    style.display = "grid";
    style.gridTemplateColumns = modifiers.gridLayout.maxCells
      ? `repeat(${modifiers.gridLayout.maxCells}, minmax(0, ${modifiers.gridLayout.cellWidth}))`
      : `repeat(auto-fill, minmax(${modifiers.gridLayout.cellWidth}, ${modifiers.gridLayout.cellWidth}))`;
    style.gridAutoRows = modifiers.gridLayout.cellHeight;
    style.columnGap = modifiers.gridLayout.gapX;
    style.rowGap = modifiers.gridLayout.gapY;
    style.justifyContent = alignmentToJustify(modifiers.gridLayout.horizontal);
    style.alignContent = alignmentToContent(modifiers.gridLayout.vertical);
    style.alignItems = "stretch";
  }

  if (modifiers.tableLayout) {
    style.display = "grid";
    style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    style.columnGap = modifiers.tableLayout.gapX;
    style.rowGap = modifiers.tableLayout.gapY;
    style.justifyContent = alignmentToJustify(modifiers.tableLayout.horizontal);
    style.alignContent = alignmentToContent(modifiers.tableLayout.vertical);
  }

  if (modifiers.pageLayout) {
    style.display = "flex";
    style.flexDirection = modifiers.pageLayout.direction;
    style.gap = modifiers.pageLayout.gap;
    style.justifyContent = alignmentToJustify(modifiers.pageLayout.horizontal);
    style.alignItems = alignmentToItems(modifiers.pageLayout.vertical);
    style.overflow = "hidden";
  }

  if (modifiers.aspectRatio) {
    style.aspectRatio = String(modifiers.aspectRatio);
  }

  if (modifiers.sizeConstraint) {
    if (modifiers.sizeConstraint.minWidth !== undefined) {
      style.minWidth = `${modifiers.sizeConstraint.minWidth}px`;
    }
    if (modifiers.sizeConstraint.minHeight !== undefined) {
      style.minHeight = `${modifiers.sizeConstraint.minHeight}px`;
    }
    if (modifiers.sizeConstraint.maxWidth !== undefined) {
      style.maxWidth = `${modifiers.sizeConstraint.maxWidth}px`;
    }
    if (modifiers.sizeConstraint.maxHeight !== undefined) {
      style.maxHeight = `${modifiers.sizeConstraint.maxHeight}px`;
    }
  }

  if (modifiers.flexItem && parentHasLayout) {
    applyFlexItemStyle(style, modifiers.flexItem);
  }

  return style;
}

export function createTextStyle(node: RobloxVNode, modifiers: RobloxModifiers = {}): CSSProperties {
  const props = node.props;
  const textTransparency = numeric(props.TextTransparency, 0);
  const textSize = clamp(
    numeric(props.TextSize, 14),
    modifiers.textSizeConstraint?.min ?? 0,
    modifiers.textSizeConstraint?.max ?? Number.POSITIVE_INFINITY,
  );
  const strokeTransparency = numeric(props.TextStrokeTransparency, 1);

  return {
    color: colorToCss(props.TextColor3, ROBLOX_DEFAULT_TEXT, 1 - textTransparency),
    fontFamily: ROBLOX_FONT_STACK,
    fontSize: `${textSize}px`,
    fontWeight: enumName(props.Font) === "Bold" ? 700 : 400,
    justifyContent: textXAlignmentToJustify(enumName(props.TextXAlignment)),
    textAlign: textXAlignmentToCss(enumName(props.TextXAlignment)),
    alignItems: textYAlignmentToCss(enumName(props.TextYAlignment)),
    whiteSpace: props.TextWrapped === true ? "normal" : "nowrap",
    lineHeight: "normal",
    textOverflow: enumName(props.TextTruncate) === "AtEnd" ? "ellipsis" : undefined,
    textShadow:
      strokeTransparency < 1
        ? `0 0 1px ${colorToCss(
            props.TextStrokeColor3,
            ROBLOX_DEFAULT_TEXT,
            1 - strokeTransparency,
          )}`
        : undefined,
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

function colorSequenceToCss(
  value: RobloxSerializedValue | undefined,
  rotation = 0,
): string | undefined {
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

  return stops.length > 0 ? `linear-gradient(${90 + rotation}deg, ${stops.join(", ")})` : undefined;
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
  if (value === "Left") return "left";
  return "center";
}

function textXAlignmentToJustify(value: string | undefined): CSSProperties["justifyContent"] {
  if (value === "Right") return "flex-end";
  if (value === "Left") return "flex-start";
  return "center";
}

function textYAlignmentToCss(value: string | undefined): CSSProperties["alignItems"] {
  if (value === "Bottom") return "flex-end";
  if (value === "Top") return "flex-start";
  return "center";
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

function alignmentToContent(value: string | undefined): CSSProperties["alignContent"] {
  if (value === "Bottom") return "flex-end";
  if (value === "Center") return "center";
  return "flex-start";
}

function listMainAlignment(layout: NonNullable<RobloxModifiers["listLayout"]>): CSSProperties["justifyContent"] {
  const mainFlex = layout.direction === "row" ? layout.horizontalFlex : layout.verticalFlex;
  return flexAlignmentToJustify(mainFlex) ?? alignmentToJustify(
    layout.direction === "row" ? layout.horizontal : layout.vertical,
  );
}

function listCrossAlignment(layout: NonNullable<RobloxModifiers["listLayout"]>): CSSProperties["alignItems"] {
  const crossFlex = layout.direction === "row" ? layout.verticalFlex : layout.horizontalFlex;
  return flexAlignmentToItems(crossFlex) ?? alignmentToItems(
    layout.direction === "row" ? layout.vertical : layout.horizontal,
  );
}

function flexAlignmentToJustify(value: string | undefined): CSSProperties["justifyContent"] | undefined {
  if (value === "SpaceBetween") return "space-between";
  if (value === "SpaceAround") return "space-around";
  if (value === "SpaceEvenly") return "space-evenly";
  if (value === "Fill") return "space-between";
  return undefined;
}

function flexAlignmentToItems(value: string | undefined): CSSProperties["alignItems"] | undefined {
  if (value === "Fill") return "stretch";
  return undefined;
}

function lineAlignmentToContent(value: string | undefined): CSSProperties["alignContent"] {
  if (value === "Center") return "center";
  if (value === "End") return "flex-end";
  if (value === "Stretch") return "stretch";
  return "flex-start";
}

function lineAlignmentToSelf(value: string | undefined): CSSProperties["alignSelf"] | undefined {
  if (value === "Center") return "center";
  if (value === "End") return "flex-end";
  if (value === "Stretch") return "stretch";
  if (value === "Start") return "flex-start";
  return undefined;
}

function applyFlexItemStyle(
  style: CSSProperties,
  flexItem: NonNullable<RobloxModifiers["flexItem"]>,
): void {
  if (flexItem.mode === "Grow") {
    style.flexGrow = 1;
    style.flexShrink = 0;
  } else if (flexItem.mode === "Shrink") {
    style.flexGrow = 0;
    style.flexShrink = 1;
  } else if (flexItem.mode === "Fill") {
    style.flexGrow = 1;
    style.flexShrink = 1;
  } else if (flexItem.mode === "Custom") {
    style.flexGrow = flexItem.growRatio;
    style.flexShrink = flexItem.shrinkRatio;
  } else {
    style.flexGrow = 0;
    style.flexShrink = 0;
  }

  const alignSelf = lineAlignmentToSelf(flexItem.itemLineAlignment);
  if (alignSelf) {
    style.alignSelf = alignSelf;
  }
}

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("rgba(")) return color;
  return color.replace(/,\s*[\d.]+\)$/, `, ${clamp(alpha, 0, 1)})`);
}

function defaultBackgroundColor(className: string, alpha: number): string {
  if (className === "ImageLabel" || className === "ImageButton") {
    return "transparent";
  }

  return `rgba(${ROBLOX_DEFAULT_BACKGROUND.r}, ${ROBLOX_DEFAULT_BACKGROUND.g}, ${
    ROBLOX_DEFAULT_BACKGROUND.b
  }, ${clamp(alpha, 0, 1)})`;
}

function defaultBorderSize(className: string): number {
  if (className === "ImageLabel" || className === "ImageButton") {
    return 0;
  }

  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
