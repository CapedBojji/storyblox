import { describe, expect, test } from "vitest";
import type { StoryManifest } from "../src/shared/types.js";
import { buildStoryTree, findStoryNodePath } from "../src/client/storyTree.js";

describe("story tree", () => {
  test("groups flat stories under category roots", () => {
    const tree = buildStoryTree([
      story({ id: "primary", group: "Buttons", name: "Primary", relativePath: "Buttons/Primary.story.luau" }),
      story({ id: "loose", group: "Unknown Stories", name: "Loose", relativePath: "Loose.story.luau" }),
    ]);

    expect(tree.map((node) => node.label)).toEqual(["Buttons", "Unknown Stories"]);
    expect(tree[0]?.children.map((node) => node.label)).toEqual(["Primary"]);
    expect(tree[1]?.children.map((node) => node.label)).toEqual(["Loose"]);
  });

  test("turns nested relative paths into folders", () => {
    const tree = buildStoryTree([
      story({
        id: "large",
        group: "Design System",
        name: "Large",
        relativePath: "DesignSystem/Atoms/Button/Large.story.luau",
      }),
    ]);

    expect(labels(tree[0])).toEqual(["Design System", "Atoms", "Button", "Large"]);
  });

  test("search keeps ancestors for matching leaves", () => {
    const tree = buildStoryTree(
      [
        story({
          id: "primary",
          group: "Design System",
          name: "Primary",
          relativePath: "DesignSystem/Atoms/Button/Primary.story.luau",
        }),
        story({
          id: "secondary",
          group: "Design System",
          name: "Secondary",
          relativePath: "DesignSystem/Atoms/Button/Secondary.story.luau",
        }),
      ],
      "secondary",
    );

    expect(labels(tree[0])).toEqual(["Design System", "Atoms", "Button", "Secondary"]);
  });

  test("finds the selected story path for auto-expansion", () => {
    const tree = buildStoryTree([
      story({
        id: "afternoon",
        group: "Charts",
        name: "Afternoon",
        relativePath: "Charts/Timeframe/Afternoon.story.luau",
      }),
    ]);

    expect(findStoryNodePath(tree, "afternoon")).toEqual([
      "root:Charts",
      "folder:Charts/Timeframe",
      "story:afternoon",
    ]);
  });
});

function story(overrides: Partial<StoryManifest>): StoryManifest {
  return {
    id: "story",
    name: "Story",
    filePath: `/project/${overrides.relativePath ?? "Story.story.luau"}`,
    relativePath: "Story.story.luau",
    group: "Stories",
    controls: {},
    ...overrides,
  };
}

function labels(node: { label: string; children: Array<{ label: string; children: never[] }> } | undefined): string[] {
  if (!node) return [];
  return [node.label, ...(node.children[0] ? labels(node.children[0]) : [])];
}
