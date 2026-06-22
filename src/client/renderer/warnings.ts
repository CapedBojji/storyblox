import type { RobloxVNode } from "../../shared/types";

const SUPPORTED_CLASSES = new Set([
  "Frame",
  "TextLabel",
  "TextButton",
  "ImageLabel",
  "ImageButton",
  "ScrollingFrame",
  "UICorner",
  "UIStroke",
  "UIPadding",
  "UIListLayout",
  "UIGridLayout",
  "UIGradient",
  "UIAspectRatioConstraint",
  "UISizeConstraint",
  "UITextSizeConstraint",
]);

const SUPPORTED_PROPS = new Set([
  "Active",
  "AnchorPoint",
  "AspectRatio",
  "AutomaticCanvasSize",
  "BackgroundColor3",
  "BackgroundTransparency",
  "BorderColor3",
  "BorderSizePixel",
  "CanvasSize",
  "Color",
  "CornerRadius",
  "FillDirection",
  "HorizontalAlignment",
  "Image",
  "ImageColor3",
  "ImageTransparency",
  "LayoutOrder",
  "Padding",
  "PaddingBottom",
  "PaddingLeft",
  "PaddingRight",
  "PaddingTop",
  "Position",
  "ScaleType",
  "Size",
  "Text",
  "TextColor3",
  "TextSize",
  "TextTransparency",
  "TextWrapped",
  "TextXAlignment",
  "TextYAlignment",
  "Thickness",
  "Transparency",
  "VerticalAlignment",
  "Visible",
  "ZIndex",
]);

export function collectRendererWarnings(node: RobloxVNode): string[] {
  const warnings: string[] = [];
  visit(node, warnings);
  return warnings;
}

function visit(node: RobloxVNode, warnings: string[]): void {
  if (!SUPPORTED_CLASSES.has(node.className)) {
    warnings.push(`Unsupported class ${node.className}; rendering its children best-effort.`);
  }

  for (const key of Object.keys(node.props ?? {})) {
    if (!SUPPORTED_PROPS.has(key)) {
      warnings.push(`Unsupported ${node.className}.${key}; property was ignored.`);
    }
  }

  for (const child of node.children ?? []) {
    visit(child, warnings);
  }
}
