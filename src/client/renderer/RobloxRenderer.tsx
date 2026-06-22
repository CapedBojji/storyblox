import type { RobloxSerializedValue, RobloxVNode } from "../../shared/types";
import type { ReactElement } from "react";
import { collectModifiers, createNodeStyle, createTextStyle, colorToCss } from "./style";

const MODIFIER_CLASSES = new Set([
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

export function RobloxRenderer({
  node,
  parentHasLayout = false,
  isRoot = false,
}: {
  node: RobloxVNode;
  parentHasLayout?: boolean;
  isRoot?: boolean;
}): ReactElement {
  if (MODIFIER_CLASSES.has(node.className)) {
    return <></>;
  }

  const modifiers = collectModifiers(node.children ?? []);
  const visualChildren = (node.children ?? []).filter((child) => !MODIFIER_CLASSES.has(child.className));
  const hasLayout = Boolean(modifiers.listLayout);
  const style = createNodeStyle(node, modifiers, parentHasLayout, isRoot);

  if (node.className === "TextButton") {
    return (
      <button className="roblox-node roblox-button" style={{ ...style, ...createTextStyle(node) }} type="button">
        <span>{String(node.props.Text ?? "")}</span>
        {visualChildren.map((child, index) => (
          <RobloxRenderer key={`${child.name ?? child.className}-${index}`} node={child} parentHasLayout={hasLayout} />
        ))}
      </button>
    );
  }

  if (node.className === "TextLabel") {
    return (
      <div className="roblox-node roblox-text" style={{ ...style, ...createTextStyle(node) }}>
        <span>{String(node.props.Text ?? "")}</span>
        {visualChildren.map((child, index) => (
          <RobloxRenderer key={`${child.name ?? child.className}-${index}`} node={child} parentHasLayout={hasLayout} />
        ))}
      </div>
    );
  }

  if (node.className === "ImageLabel" || node.className === "ImageButton") {
    const image = typeof node.props.Image === "string" ? node.props.Image : "";
    const content = image.startsWith("http://") || image.startsWith("https://") ? (
      <img alt="" src={image} style={imageStyle(node.props.ImageTransparency)} />
    ) : (
      <div className="asset-placeholder">{image || "Image"}</div>
    );

    const element = (
      <>
        {content}
        {visualChildren.map((child, index) => (
          <RobloxRenderer key={`${child.name ?? child.className}-${index}`} node={child} parentHasLayout={hasLayout} />
        ))}
      </>
    );

    if (node.className === "ImageButton") {
      return (
        <button className="roblox-node roblox-image-button" style={style} type="button">
          {element}
        </button>
      );
    }

    return (
      <div className="roblox-node roblox-image" style={style}>
        {element}
      </div>
    );
  }

  return (
    <div className="roblox-node" style={style}>
      {visualChildren.map((child, index) => (
        <RobloxRenderer key={`${child.name ?? child.className}-${index}`} node={child} parentHasLayout={hasLayout} />
      ))}
    </div>
  );
}

function imageStyle(transparency: RobloxSerializedValue | undefined): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: 1 - (typeof transparency === "number" ? transparency : 0),
  };
}
