import type { RobloxSerializedValue, RobloxVNode } from "../../shared/types";
import type { ReactElement } from "react";
import {
  collectModifiers,
  createNodeStyle,
  createTextStyle,
  colorToCss,
  MODIFIER_CLASSES,
  ROOT_INSTANCE_PATH,
} from "./style";

export function RobloxRenderer({
  node,
  path = ROOT_INSTANCE_PATH,
  parentHasLayout = false,
  isRoot = false,
  selectedPath,
  hoveredPath,
  onSelectPath,
  onHoverPath,
}: {
  node: RobloxVNode;
  path?: string;
  parentHasLayout?: boolean;
  isRoot?: boolean;
  selectedPath?: string | null | undefined;
  hoveredPath?: string | null | undefined;
  onSelectPath?: ((path: string) => void) | undefined;
  onHoverPath?: ((path: string | null) => void) | undefined;
}): ReactElement {
  if (MODIFIER_CLASSES.has(node.className)) {
    return <></>;
  }

  const modifiers = collectModifiers(node.children ?? []);
  const hasLayout = Boolean(
    modifiers.listLayout ?? modifiers.gridLayout ?? modifiers.tableLayout ?? modifiers.pageLayout,
  );
  const style = createNodeStyle(node, modifiers, parentHasLayout, isRoot);
  const selectionProps = createSelectionProps(path, onSelectPath, onHoverPath);
  const nodeClassName = selectableClassName(
    nodeHasGuiEvents(node) ? "roblox-node roblox-node-has-gui-events" : "roblox-node",
    path,
    selectedPath,
    hoveredPath,
  );
  const children = node.children.map((child, index) => (
    <RobloxRenderer
      key={`${child.name ?? child.className}-${index}`}
      node={child}
      path={`${path}.${index}`}
      parentHasLayout={hasLayout}
      selectedPath={selectedPath}
      hoveredPath={hoveredPath}
      onSelectPath={onSelectPath}
      onHoverPath={onHoverPath}
    />
  ));

  if (node.className === "TextButton") {
    return (
      <button
        {...selectionProps}
        className={`${nodeClassName} roblox-button`}
        style={{ ...style, ...createTextStyle(node, modifiers) }}
        type="button"
      >
        <span>{String(node.props.Text ?? "")}</span>
        {children}
      </button>
    );
  }

  if (node.className === "TextLabel") {
    return (
      <div
        {...selectionProps}
        className={`${nodeClassName} roblox-text`}
        style={{ ...style, ...createTextStyle(node, modifiers) }}
      >
        <span>{String(node.props.Text ?? "")}</span>
        {children}
      </div>
    );
  }

  if (node.className === "TextBox") {
    const textStyle = createTextStyle(node, modifiers);
    const inputStyle = {
      color: textStyle.color,
      fontFamily: textStyle.fontFamily,
      fontSize: textStyle.fontSize,
      fontWeight: textStyle.fontWeight,
      textAlign: textStyle.textAlign,
      lineHeight: textStyle.lineHeight,
      "--placeholder-color": colorToCss(node.props.PlaceholderColor3, "rgba(27, 42, 53, 0.45)"),
    } as React.CSSProperties;
    const inputValue = String(node.props.Text ?? "");
    const input = node.props.MultiLine === true ? (
      <textarea
        className="roblox-textbox-input"
        placeholder={String(node.props.PlaceholderText ?? "")}
        readOnly
        style={inputStyle}
        value={inputValue}
      />
    ) : (
      <input
        className="roblox-textbox-input"
        placeholder={String(node.props.PlaceholderText ?? "")}
        readOnly
        style={inputStyle}
        type="text"
        value={inputValue}
      />
    );

    return (
      <div {...selectionProps} className={`${nodeClassName} roblox-textbox`} style={style}>
        {input}
        {children}
      </div>
    );
  }

  if (node.className === "ImageLabel" || node.className === "ImageButton") {
    const image = typeof node.props.Image === "string" ? node.props.Image : "";
    const content = image.startsWith("http://") || image.startsWith("https://") ? (
      <img alt="" src={image} style={imageStyle(node.props.ImageTransparency)} />
    ) : (
      <div
        className="asset-placeholder"
        style={{
          color: colorToCss(node.props.ImageColor3, "currentColor"),
          opacity: imageOpacity(node.props.ImageTransparency),
        }}
      >
        {image || "Image"}
      </div>
    );

    const element = (
      <>
        {content}
        {children}
      </>
    );

    if (node.className === "ImageButton") {
      return (
        <button
          {...selectionProps}
          className={`${nodeClassName} roblox-image-button`}
          style={style}
          type="button"
        >
          {element}
        </button>
      );
    }

    return (
      <div {...selectionProps} className={`${nodeClassName} roblox-image`} style={style}>
        {element}
      </div>
    );
  }

  if (node.className === "VideoFrame" || node.className === "ViewportFrame") {
    const label =
      node.className === "VideoFrame"
        ? String(node.props.Video ?? "VideoFrame")
        : "ViewportFrame";

    return (
      <div {...selectionProps} className={`${nodeClassName} roblox-media-frame`} style={style}>
        <div className="asset-placeholder">{label}</div>
        {children}
      </div>
    );
  }

  return (
    <div {...selectionProps} className={nodeClassName} style={style}>
      {children}
    </div>
  );
}

function nodeHasGuiEvents(node: RobloxVNode): boolean {
  return (
    "MouseEnter" in node.props ||
    "MouseLeave" in node.props ||
    "MouseMoved" in node.props ||
    "MouseButton1Click" in node.props ||
    "MouseButton1Down" in node.props ||
    "MouseButton1Up" in node.props ||
    "Activated" in node.props ||
    "InputBegan" in node.props ||
    "InputChanged" in node.props ||
    "InputEnded" in node.props
  );
}

function selectableClassName(
  className: string,
  path: string,
  selectedPath: string | null | undefined,
  hoveredPath: string | null | undefined,
): string {
  const states = [];
  if (path === selectedPath) states.push("selected");
  if (path === hoveredPath && hoveredPath !== selectedPath) states.push("hovered");
  return states.length > 0
    ? `${className} ${states.map((state) => `roblox-node-${state}`).join(" ")}`
    : className;
}

function createSelectionProps(
  path: string,
  onSelectPath: ((path: string) => void) | undefined,
  onHoverPath: ((path: string | null) => void) | undefined,
): React.HTMLAttributes<HTMLElement> & { "data-ui-claps-path": string } {
  return {
    "data-ui-claps-path": path,
    onClick: (event) => {
      event.stopPropagation();
      onSelectPath?.(path);
    },
    onMouseEnter: (event) => {
      event.stopPropagation();
      onHoverPath?.(path);
    },
    onMouseLeave: (event) => {
      event.stopPropagation();
      onHoverPath?.(null);
    },
  };
}

function imageStyle(transparency: RobloxSerializedValue | undefined): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: imageOpacity(transparency),
  };
}

function imageOpacity(transparency: RobloxSerializedValue | undefined): number {
  return 1 - (typeof transparency === "number" ? transparency : 0);
}
