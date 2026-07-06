import type { StoryManifest } from "../shared/types";

export type StoryTreeNodeType = "root" | "folder" | "story";

export interface StoryTreeNode {
  id: string;
  type: StoryTreeNodeType;
  label: string;
  children: StoryTreeNode[];
  story?: StoryManifest;
  searchText: string;
}

interface MutableStoryTreeNode extends StoryTreeNode {
  children: MutableStoryTreeNode[];
}

export function buildStoryTree(stories: StoryManifest[], searchQuery = ""): StoryTreeNode[] {
  const roots: MutableStoryTreeNode[] = [];
  const rootMap = new Map<string, MutableStoryTreeNode>();

  for (const story of stories) {
    const root = getOrCreateNode(rootMap, roots, {
      id: `root:${story.group}`,
      label: story.group,
      type: "root",
      searchText: `${story.group} ${story.relativePath}`,
    });

    let parent = root;
    let parentPath = story.group;
    for (const segment of getFolderSegments(story)) {
      parentPath = `${parentPath}/${segment}`;
      const folder = getOrCreateNode(
        new Map(parent.children.map((child) => [child.id, child])),
        parent.children,
        {
          id: `folder:${parentPath}`,
          label: segment,
          type: "folder",
          searchText: `${parentPath} ${story.relativePath}`,
        },
      );
      parent = folder;
    }

    parent.children.push({
      id: `story:${story.id}`,
      label: story.name,
      type: "story",
      children: [],
      story,
      searchText: `${story.group} ${story.name} ${story.relativePath}`,
    });
  }

  const query = searchQuery.trim().toLowerCase();
  if (!query) return roots;

  return roots
    .map((node) => filterStoryTreeNode(node, query))
    .filter((node): node is StoryTreeNode => node !== null);
}

export function findStoryNodePath(nodes: StoryTreeNode[], storyId: string): string[] {
  for (const node of nodes) {
    const path = findStoryNodePathInNode(node, storyId, []);
    if (path.length > 0) return path;
  }

  return [];
}

function getOrCreateNode(
  map: Map<string, MutableStoryTreeNode>,
  siblings: MutableStoryTreeNode[],
  node: Omit<MutableStoryTreeNode, "children">,
): MutableStoryTreeNode {
  const existing = map.get(node.id);
  if (existing) return existing;

  const next: MutableStoryTreeNode = { ...node, children: [] };
  siblings.push(next);
  map.set(next.id, next);
  return next;
}

function getFolderSegments(story: StoryManifest): string[] {
  const segments = story.relativePath.split("/").slice(0, -1).filter(Boolean);
  if (segments[0] && normalizeLabel(segments[0]) === normalizeLabel(story.group)) {
    return segments.slice(1);
  }

  return segments;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[-_\s]+/g, "");
}

function filterStoryTreeNode(node: StoryTreeNode, query: string): StoryTreeNode | null {
  const children = node.children
    .map((child) => filterStoryTreeNode(child, query))
    .filter((child): child is StoryTreeNode => child !== null);
  const matches = node.searchText.toLowerCase().includes(query);

  if (!matches && children.length === 0) return null;
  return { ...node, children };
}

function findStoryNodePathInNode(
  node: StoryTreeNode,
  storyId: string,
  parentPath: string[],
): string[] {
  const nextPath = [...parentPath, node.id];
  if (node.story?.id === storyId) return nextPath;

  for (const child of node.children) {
    const path = findStoryNodePathInNode(child, storyId, nextPath);
    if (path.length > 0) return path;
  }

  return [];
}
