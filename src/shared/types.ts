export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ControlType =
  | "string"
  | "boolean"
  | "number"
  | "slider"
  | "color"
  | "select"
  | "radio"
  | "check"
  | "multiselect"
  | "object"
  | "udim"
  | "udim2";

export interface ControlDefinition {
  type: ControlType;
  default: JsonValue;
  label?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleStep?: number;
  offsetMin?: number;
  offsetMax?: number;
  offsetStep?: number;
  options?: Array<{ label: string; value: JsonValue }>;
  inline?: boolean;
}

export interface StoryManifest {
  id: string;
  name: string;
  filePath: string;
  relativePath: string;
  group: string;
  controls: Record<string, ControlDefinition>;
}

export interface StorybookManifest {
  name: string;
  filePath: string;
  relativePath: string;
  rootDir: string;
}

export interface ProjectManifest {
  root: string;
  projectRoot: string;
  configPath: string;
  zuneCommand: string;
  stories: StoryManifest[];
  storybooks: StorybookManifest[];
  warnings: string[];
}

export interface RobloxEnumItem {
  $type: "EnumItem";
  enumType: string;
  name: string;
}

export interface RobloxColor3 {
  $type: "Color3";
  r: number;
  g: number;
  b: number;
}

export interface RobloxUDim {
  $type: "UDim";
  scale: number;
  offset: number;
}

export interface RobloxUDim2 {
  $type: "UDim2";
  x: RobloxUDim;
  y: RobloxUDim;
}

export interface RobloxVector2 {
  $type: "Vector2";
  x: number;
  y: number;
}

export interface RobloxColorSequence {
  $type: "ColorSequence";
  keypoints: Array<{ time: number; value: RobloxColor3 }>;
}

export interface RobloxNumberSequence {
  $type: "NumberSequence";
  keypoints: Array<{ time: number; value: number }>;
}

export interface RobloxFont {
  $type: "Font";
  family?: RobloxEnumItem | string;
}

export type RobloxSerializedValue =
  | JsonPrimitive
  | RobloxEnumItem
  | RobloxColor3
  | RobloxUDim
  | RobloxUDim2
  | RobloxVector2
  | RobloxColorSequence
  | RobloxNumberSequence
  | RobloxFont
  | RobloxSerializedValue[]
  | { [key: string]: RobloxSerializedValue };

export interface RobloxVNode {
  className: string;
  name?: string;
  props: Record<string, RobloxSerializedValue>;
  children: RobloxVNode[];
}

export interface RenderRequest {
  storyId: string;
  props: Record<string, JsonValue>;
}

export interface RenderResponse {
  ok: boolean;
  tree?: RobloxVNode;
  warnings: string[];
  output?: RenderOutputEntry[];
  error?: {
    message: string;
    stack?: string;
  };
}

export interface RenderOutputEntry {
  level: "print" | "warn";
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  details?: string;
}

export interface ProjectUpdateEvent {
  type: "project-update";
  version: number;
}
