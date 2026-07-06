import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Folder,
  Grid3x3,
  LayoutGrid,
  Link,
  Maximize,
  Minimize,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scan,
  Search,
  Terminal,
  Sun,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import type {
  ControlDefinition,
  JsonValue,
  ProjectUpdateEvent,
  ProjectManifest,
  RenderResponse,
  RobloxUDim,
  StoryManifest,
} from "../shared/types";
import { fetchProject, renderStory } from "./api";
import { getApiUrl, isEmbeddedPreview } from "./environment";
import { RobloxRenderer } from "./renderer/RobloxRenderer";
import { collectRendererWarnings } from "./renderer/warnings";
import { color3ToHex, hexToColor3 } from "./renderer/style";
import { buildStoryTree, findStoryNodePath, type StoryTreeNode } from "./storyTree";

type ControlValues = Record<string, JsonValue>;

type Theme = "light" | "dark";
type AddonTab = "controls" | "warnings" | "output";

function initialUrlParams(): URLSearchParams {
  try {
    if (isEmbeddedPreview()) return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

const THEME_KEY = "ui-claps-theme";
const SIDEBAR_KEY = "ui-claps-sidebar-collapsed";
const EXPANDED_NODES_KEY = "ui-claps-expanded-story-nodes";
const ADDON_HEIGHT_KEY = "ui-claps-addon-height";
const ADDON_COLLAPSED_KEY = "ui-claps-addon-collapsed";
const MIN_ADDON_HEIGHT = 160;
const MAX_ADDON_HEIGHT = 560;

const THEME_ORDER: Record<Theme, Theme> = {
  light: "dark",
  dark: "light",
};

const THEME_META: Record<Theme, { icon: LucideIcon; label: string }> = {
  light: { icon: Sun, label: "Light" },
  dark: { icon: Moon, label: "Dark" },
};

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function readStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

function readStoredExpandedNodes(): Set<string> {
  try {
    const stored = localStorage.getItem(EXPANDED_NODES_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

function readStoredAddonHeight(): number {
  try {
    const stored = Number(localStorage.getItem(ADDON_HEIGHT_KEY));
    if (Number.isFinite(stored)) return clampNumber(stored, MIN_ADDON_HEIGHT, MAX_ADDON_HEIGHT);
  } catch {
    /* ignore */
  }
  return 280;
}

function readStoredAddonCollapsed(): boolean {
  try {
    return localStorage.getItem(ADDON_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function App(): ReactElement {
  const embedded = isEmbeddedPreview();
  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialUrlParams().get("story"),
  );
  const [controls, setControls] = useState<ControlValues>({});
  const [rendered, setRendered] = useState<RenderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredSidebarCollapsed);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(readStoredExpandedNodes);
  const [searchQuery, setSearchQuery] = useState("");
  const [addonTab, setAddonTab] = useState<AddonTab>("controls");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(() => initialUrlParams().get("full") === "1");
  const [gridOn, setGridOn] = useState(false);
  const [outlineOn, setOutlineOn] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [addonHeight, setAddonHeight] = useState(readStoredAddonHeight);
  const [addonCollapsed, setAddonCollapsed] = useState(readStoredAddonCollapsed);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hotReloadVersion, setHotReloadVersion] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void loadProject();
  }, []);

  useEffect(() => {
    const events = new EventSource(getApiUrl("/api/events"));
    events.addEventListener("project-update", (event) => {
      try {
        const update = JSON.parse((event as MessageEvent<string>).data) as ProjectUpdateEvent;
        setHotReloadVersion(update.version);
      } catch {
        setHotReloadVersion((version) => version + 1);
      }
      void loadProject({ showLoading: false });
    });
    events.onerror = () => {
      /* EventSource reconnects automatically. */
    };
    return () => events.close();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_NODES_KEY, JSON.stringify(Array.from(expandedNodeIds).sort()));
    } catch {
      /* ignore */
    }
  }, [expandedNodeIds]);

  useEffect(() => {
    try {
      localStorage.setItem(ADDON_HEIGHT_KEY, String(addonHeight));
    } catch {
      /* ignore */
    }
  }, [addonHeight]);

  useEffect(() => {
    try {
      localStorage.setItem(ADDON_COLLAPSED_KEY, String(addonCollapsed));
    } catch {
      /* ignore */
    }
  }, [addonCollapsed]);

  const selectedStory = useMemo(
    () => project?.stories.find((story) => story.id === selectedId) ?? project?.stories[0] ?? null,
    [project, selectedId],
  );

  // In browser mode, keep the story id in the URL for shareable links. The
  // VS Code webview does not expose browser navigation, so embedded previews
  // keep story selection in React state only.
  useEffect(() => {
    if (!selectedStory) return;
    if (!embedded) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("story", selectedStory.id);
        window.history.replaceState(null, "", url);
      } catch {
        /* ignore */
      }
    }
    document.title = `${selectedStory.name} ⋅ UI Claps`;
    setLinkCopied(false);
  }, [embedded, selectedStory?.id, selectedStory?.name]);

  useEffect(() => {
    if (!selectedStory) return;
    setSelectedId(selectedStory.id);
    setControls(defaultControlValues(selectedStory.controls));
  }, [selectedStory?.id]);

  useEffect(() => {
    if (!selectedStory) return;
    void runRender(selectedStory, controls);
  }, [selectedStory?.id, JSON.stringify(controls), hotReloadVersion]);

  const rendererWarnings = useMemo(
    () => (rendered?.tree ? collectRendererWarnings(rendered.tree) : []),
    [rendered?.tree],
  );

  const combinedWarnings = useMemo(
    () =>
      Array.from(
        new Set([
          ...(project?.warnings ?? []),
          ...(rendered?.warnings ?? []),
          ...rendererWarnings,
        ]),
      ),
    [project?.warnings, rendered?.warnings, rendererWarnings],
  );

  const storyTree = useMemo(
    () => buildStoryTree(project?.stories ?? [], searchQuery),
    [project?.stories, searchQuery],
  );
  const fullStoryTree = useMemo(() => buildStoryTree(project?.stories ?? []), [project?.stories]);

  useEffect(() => {
    if (!selectedStory) return;
    const path = findStoryNodePath(fullStoryTree, selectedStory.id).slice(0, -1);
    if (path.length === 0) return;

    setExpandedNodeIds((current) => {
      let changed = false;
      const next = new Set(current);
      for (const nodeId of path) {
        if (next.has(nodeId)) continue;
        next.add(nodeId);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [fullStoryTree, selectedStory]);

  async function loadProject(options: { showLoading?: boolean } = {}): Promise<void> {
    const showLoading = options.showLoading ?? true;
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const nextProject = await fetchProject();
      setProject(nextProject);
      setSelectedId((current) => current ?? nextProject.stories[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function runRender(story: StoryManifest, props: ControlValues): Promise<void> {
    setRendering(true);
    setError(null);

    try {
      setRendered(await renderStory({ storyId: story.id, props }));
    } catch (renderError) {
      setRendered(null);
      setError(renderError instanceof Error ? renderError.message : String(renderError));
    } finally {
      setRendering(false);
    }
  }

  const ThemeIcon = THEME_META[theme].icon;
  const controlEntries = selectedStory ? Object.entries(selectedStory.controls) : [];
  const addonCounts: Record<AddonTab, number> = {
    controls: controlEntries.length,
    warnings: combinedWarnings.length,
    output: rendered?.output?.length ?? 0,
  };
  const outputEntries = rendered?.output ?? [];

  const stageStyle: CSSProperties = {};
  if (zoom !== 1) stageStyle.transform = `scale(${zoom})`;
  const stageClassName = [
    "preview-zoom",
    outlineOn ? "outlines" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const bandClassName = [
    "preview-band",
    gridOn ? "grid-on" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleRemount(): void {
    if (selectedStory) void runRender(selectedStory, controls);
  }

  function handleCopyLink(): void {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1600);
      },
      () => setLinkCopied(false),
    );
  }

  function handleAddonResize(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    setAddonCollapsed(false);

    const startY = event.clientY;
    const startHeight = addonHeight;
    const ownerDocument = event.currentTarget.ownerDocument;

    const move = (nativeEvent: globalThis.PointerEvent): void => {
      const nextHeight = startHeight + startY - nativeEvent.clientY;
      setAddonHeight(clampNumber(nextHeight, MIN_ADDON_HEIGHT, MAX_ADDON_HEIGHT));
    };
    const end = (): void => {
      ownerDocument.removeEventListener("pointermove", move);
      ownerDocument.removeEventListener("pointerup", end);
      ownerDocument.removeEventListener("pointercancel", end);
    };

    ownerDocument.addEventListener("pointermove", move);
    ownerDocument.addEventListener("pointerup", end);
    ownerDocument.addEventListener("pointercancel", end);
  }

  function toggleNode(nodeId: string): void {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  const shellClassName = [
    "app-shell",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    fullscreen ? "fullscreen" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const workspaceStyle = {
    "--addon-h": addonCollapsed ? "40px" : `${addonHeight}px`,
  } as CSSProperties;

  return (
    <div className={shellClassName}>
      <aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="brand">
          <div className="brand-identity">
            <div>
              <h1>UI Claps</h1>
              <p>{project ? `${project.stories.length} stories` : "Loading stories"}</p>
            </div>
          </div>
          <div className="brand-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-controls="story-sidebar-list"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={15} strokeWidth={2} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={15} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            <button
              className="icon-button refresh-button"
              type="button"
              onClick={() => void loadProject()}
              title="Refresh stories"
              aria-label="Refresh stories"
            >
              <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <label className="sidebar-search">
          <Search size={13} strokeWidth={2} aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Find components"
            aria-label="Find components"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchQuery("");
                event.currentTarget.blur();
              }
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>

        <nav className="story-list" id="story-sidebar-list" aria-label="Stories">
          {loading ? <div className="empty-state">Scanning project...</div> : null}
          {!loading && project?.stories.length === 0 ? (
            <div className="empty-state">No stories found.</div>
          ) : null}
          {!loading && project && project.stories.length > 0 && storyTree.length === 0 ? (
            <div className="empty-state">No stories match &ldquo;{searchQuery}&rdquo;.</div>
          ) : null}
          {storyTree.map((node) => (
            <StoryTreeItem
              key={node.id}
              node={node}
              depth={0}
              expandedNodeIds={expandedNodeIds}
              forceExpanded={searchQuery.trim().length > 0}
              selectedStoryId={selectedStory?.id ?? null}
              onToggle={toggleNode}
              onSelect={setSelectedId}
            />
          ))}
        </nav>
      </aside>

      <main className="workspace" style={workspaceStyle}>
        <header className="topbar">
          <div className="topbar-tools">
            <div className="toolbar-group" role="group" aria-label="Story canvas">
              <button
                className="icon-button"
                type="button"
                onClick={handleRemount}
                title="Remount story"
                aria-label="Remount story"
              >
                <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setZoom((current) => Math.min(3, current * 1.25))}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setZoom((current) => Math.max(0.25, current / 1.25))}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                disabled={zoom === 1}
                onClick={() => setZoom(1)}
                title="Reset zoom"
                aria-label="Reset zoom"
              >
                <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
              </button>
              {zoom !== 1 ? <span className="tool-label">{Math.round(zoom * 100)}%</span> : null}
            </div>
            <span className="toolbar-divider" aria-hidden="true" />
            <div className="toolbar-group" role="group" aria-label="Canvas helpers">
              <button
                className={gridOn ? "icon-button on" : "icon-button"}
                type="button"
                aria-pressed={gridOn}
                onClick={() => setGridOn((current) => !current)}
                title="Toggle canvas grid"
                aria-label="Toggle canvas grid"
              >
                <Grid3x3 size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                className={outlineOn ? "icon-button on" : "icon-button"}
                type="button"
                aria-pressed={outlineOn}
                onClick={() => setOutlineOn((current) => !current)}
                title="Outline all elements"
                aria-label="Outline all elements"
              >
                <Scan size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="topbar-actions">
            {rendering ? (
              <span className="status-chip" role="status">
                <span className="status-led" aria-hidden="true" />
                Rendering
              </span>
            ) : null}
            <button
              className="icon-button"
              type="button"
              onClick={() => setTheme((current) => THEME_ORDER[current])}
              title={`Switch to ${THEME_META[THEME_ORDER[theme]].label} theme`}
              aria-label={`Switch to ${THEME_META[THEME_ORDER[theme]].label} theme`}
            >
              <ThemeIcon size={15} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
            <button
              className="icon-button"
              type="button"
              onClick={() => setFullscreen((current) => !current)}
              title={fullscreen ? "Exit canvas focus" : "Focus canvas"}
              aria-label={fullscreen ? "Exit canvas focus" : "Focus canvas"}
            >
              {fullscreen ? (
                <Minimize size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Maximize size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            {!embedded ? (
              <button
                className={
                  linkCopied ? "icon-button text-button copied" : "icon-button text-button"
                }
                type="button"
                onClick={handleCopyLink}
                title={linkCopied ? "Story link copied" : "Copy story link"}
                aria-label={linkCopied ? "Story link copied" : "Copy story link"}
              >
                {linkCopied ? (
                  <Check size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Link size={14} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{linkCopied ? "Copied" : "Share"}</span>
              </button>
            ) : null}
          </div>
        </header>

        <section className={bandClassName}>
          <div className={stageClassName} style={stageStyle}>
            {rendered?.tree ? (
              <RobloxRenderer
                node={rendered.tree}
                isRoot
                selectedPath={selectedPath}
                hoveredPath={hoveredPath}
                onSelectPath={setSelectedPath}
                onHoverPath={setHoveredPath}
              />
            ) : null}
          </div>
          {rendered?.error ? (
            <div className="preview-message error-message">{rendered.error.message}</div>
          ) : null}
          {!rendered && !rendering && !error ? (
            <div className="preview-message">Select a story to render it.</div>
          ) : null}
          {error ? <div className="preview-message error-message">{error}</div> : null}
        </section>

        <section
          className={addonCollapsed ? "addon-panel collapsed" : "addon-panel"}
          aria-label="Story addons"
        >
          <div
            className="addon-resize-handle"
            onPointerDown={handleAddonResize}
            role="separator"
            aria-label="Resize addon panel"
            aria-orientation="horizontal"
          />
          <header className="addon-header">
            <div className="addon-tabs" role="tablist" aria-label="Story addon panels">
              {(["controls", "warnings", "output"] as const).map((tab) => (
                <button
                  aria-controls={`addon-${tab}`}
                  aria-selected={addonTab === tab}
                  className={addonTab === tab ? "addon-tab active" : "addon-tab"}
                  id={`addon-tab-${tab}`}
                  key={tab}
                  onClick={() => {
                    setAddonTab(tab);
                    setAddonCollapsed(false);
                  }}
                  role="tab"
                  type="button"
                >
                  {tab === "controls" ? "Controls" : tab === "warnings" ? "Warnings" : "Output"}
                  <span className="controls-count">{addonCounts[tab]}</span>
                </button>
              ))}
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setAddonCollapsed((current) => !current)}
              title={addonCollapsed ? "Expand addon panel" : "Collapse addon panel"}
              aria-label={addonCollapsed ? "Expand addon panel" : "Collapse addon panel"}
              aria-expanded={!addonCollapsed}
            >
              {addonCollapsed ? (
                <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </header>

          {!addonCollapsed && addonTab === "controls" ? (
            <div
              aria-labelledby="addon-tab-controls"
              className="addon-body controls-body"
              id="addon-controls"
              role="tabpanel"
            >
              {controlEntries.length === 0 ? (
                <div className="empty-state">This story has no controls.</div>
              ) : (
                <div className="controls-table">
                  <div className="controls-table-head">
                    <span>Name</span>
                    <span>Control</span>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() =>
                        selectedStory && setControls(defaultControlValues(selectedStory.controls))
                      }
                      title="Reset controls"
                      aria-label="Reset controls"
                    >
                      <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                  {controlEntries.map(([key, control]) => (
                    <div className="controls-table-row" key={key}>
                      <div className="control-name">
                        <span className="control-title">{control.label ?? key}</span>
                        {control.description ? (
                          <p className="control-description">{control.description}</p>
                        ) : null}
                      </div>
                      <div className="control-cell">
                        <ControlInput
                          control={control}
                          name={`control-${key}`}
                          value={controls[key] ?? control.default}
                          onChange={(value) =>
                            setControls((current) => ({ ...current, [key]: value }))
                          }
                        />
                      </div>
                      <span aria-hidden="true" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {!addonCollapsed && addonTab === "warnings" ? (
            <div
              aria-labelledby="addon-tab-warnings"
              className="addon-body warnings-section"
              id="addon-warnings"
              role="tabpanel"
            >
              {combinedWarnings.length === 0 ? (
                <div className="empty-state">No warnings for this story.</div>
              ) : (
                <>
                  <h3>
                    <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" />
                    Warnings
                    <span className="controls-count">{combinedWarnings.length}</span>
                  </h3>
                  <ul className="warnings-list">
                    {combinedWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}

          {!addonCollapsed && addonTab === "output" ? (
            <div
              aria-labelledby="addon-tab-output"
              className="addon-body output-section"
              id="addon-output"
              role="tabpanel"
            >
              {outputEntries.length === 0 ? (
                <div className="empty-state">No story output yet.</div>
              ) : (
                <ul className="output-list">
                  {outputEntries.map((entry, index) => (
                    <li className={`output-line ${entry.level}`} key={`${entry.level}-${index}`}>
                      <Terminal size={13} strokeWidth={2} aria-hidden="true" />
                      <span className="output-level">{entry.level}</span>
                      <span className="output-message">{entry.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function StoryTreeItem({
  node,
  depth,
  expandedNodeIds,
  forceExpanded,
  selectedStoryId,
  onToggle,
  onSelect,
}: {
  node: StoryTreeNode;
  depth: number;
  expandedNodeIds: Set<string>;
  forceExpanded: boolean;
  selectedStoryId: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (storyId: string) => void;
}): ReactElement {
  const isBranch = node.type !== "story";
  const isExpanded = forceExpanded || expandedNodeIds.has(node.id);
  const isSelected = node.story?.id === selectedStoryId;
  const iconMeta = getStoryTreeIcon(node);
  const style = { "--tree-depth": depth } as CSSProperties;

  return (
    <div className="story-tree-node">
      <button
        aria-expanded={isBranch ? isExpanded : undefined}
        className={[
          "story-tree-row",
          `story-tree-row-${node.type}`,
          isSelected ? "active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          if (isBranch) {
            onToggle(node.id);
          } else if (node.story) {
            onSelect(node.story.id);
          }
        }}
        style={style}
        title={node.story?.relativePath ?? node.label}
        type="button"
      >
        <span className="tree-expander" aria-hidden="true">
          {isBranch ? (
            isExpanded ? (
              <ChevronDown size={13} strokeWidth={2} />
            ) : (
              <ChevronRight size={13} strokeWidth={2} />
            )
          ) : null}
        </span>
        {iconMeta ? (
          <iconMeta.icon
            className={`tree-node-icon ${iconMeta.tone}`}
            size={12}
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : null}
        <span className="tree-node-label">{node.label}</span>
      </button>

      {isBranch && isExpanded
        ? node.children.map((child) => (
            <StoryTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodeIds={expandedNodeIds}
              forceExpanded={forceExpanded}
              selectedStoryId={selectedStoryId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

/* Storybook's node-type icon semantics: roots have no icon (they render as
   uppercase section headings); folders are pink; a folder whose children are
   all stories reads as a "component" and gets the blue grid; stories get the
   teal bookmark; doc-flavored stories get the orange file. */
function getStoryTreeIcon(node: StoryTreeNode): { icon: LucideIcon; tone: string } | null {
  if (node.type === "root") return null;
  if (node.type === "folder") {
    const isComponent =
      node.children.length > 0 && node.children.every((child) => child.type === "story");
    return isComponent
      ? { icon: LayoutGrid, tone: "icon-component" }
      : { icon: Folder, tone: "icon-folder" };
  }
  if (/\bdocs?\b/i.test(node.label)) return { icon: FileText, tone: "icon-doc" };
  return { icon: Bookmark, tone: "icon-story" };
}

function sameJsonValue(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function ControlInput({
  control,
  name,
  value,
  onChange,
}: {
  control: ControlDefinition;
  name?: string | undefined;
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}): ReactElement {
  if (control.type === "boolean") {
    return (
      <label className="toggle-control">
        <input
          checked={value === true}
          type="checkbox"
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="toggle-track" aria-hidden="true" />
        <span>{value === true ? "On" : "Off"}</span>
      </label>
    );
  }

  if (control.type === "number") {
    const numericValue = typeof value === "number" ? value : Number(control.default) || 0;
    return (
      <NumericTextBox
        ariaLabel="Number value"
        glyph="#"
        value={numericValue}
        min={control.min}
        max={control.max}
        step={control.step}
        onChange={(nextValue) => onChange(nextValue)}
      />
    );
  }

  if (control.type === "slider") {
    const numericValue = typeof value === "number" ? value : Number(control.default) || 0;
    return (
      <div className="slider-control">
        <input
          aria-label="Slider value"
          type="range"
          value={numericValue}
          min={control.min ?? 0}
          max={control.max ?? 100}
          step={control.step ?? 1}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <NumericTextBox
          ariaLabel="Exact value"
          glyph="="
          value={numericValue}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={(nextValue) => onChange(nextValue)}
        />
      </div>
    );
  }

  if (control.type === "color") {
    const hex = color3ToHex(value);
    return (
      <div className="color-control">
        <label className="color-chip" title={`Pick color ${hex}`}>
          <span className="color-chip-swatch" style={{ backgroundColor: hex }} aria-hidden="true" />
          <input
            aria-label="Color swatch"
            type="color"
            value={hex}
            onChange={(event) =>
              onChange(hexToColor3(event.currentTarget.value) as unknown as JsonValue)
            }
          />
        </label>
        <input
          className="color-hex-input"
          aria-label="Hex color"
          type="text"
          value={hex}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (/^#[0-9a-fA-F]{6}$/.test(next)) {
              onChange(hexToColor3(next) as unknown as JsonValue);
            }
          }}
        />
      </div>
    );
  }

  if (control.type === "udim") {
    return (
      <UDimControl
        control={control}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (control.type === "udim2") {
    return (
      <UDim2Control
        control={control}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (control.type === "select") {
    return (
      <select
        value={JSON.stringify(value)}
        onChange={(event) => onChange(JSON.parse(event.currentTarget.value) as JsonValue)}
      >
        {(control.options ?? []).map((option) => (
          <option key={JSON.stringify(option.value)} value={JSON.stringify(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (control.type === "radio") {
    return (
      <div className={control.inline ? "option-group inline" : "option-group"} role="radiogroup">
        {(control.options ?? []).map((option) => (
          <label className="option-item" key={JSON.stringify(option.value)}>
            <input
              type="radio"
              name={name ?? "ui-claps-radio"}
              checked={sameJsonValue(value, option.value)}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (control.type === "check" || control.type === "multiselect") {
    const selected = Array.isArray(value)
      ? value
      : Array.isArray(control.default)
        ? control.default
        : [];

    if (control.type === "check") {
      return (
        <div className={control.inline ? "option-group inline" : "option-group"}>
          {(control.options ?? []).map((option) => {
            const isChecked = selected.some((entry) => sameJsonValue(entry, option.value));
            return (
              <label className="option-item" key={JSON.stringify(option.value)}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() =>
                    onChange(
                      isChecked
                        ? selected.filter((entry) => !sameJsonValue(entry, option.value))
                        : [...selected, option.value],
                    )
                  }
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <select
        multiple
        size={Math.min(Math.max(control.options?.length ?? 3, 2), 4)}
        value={selected.map((entry) => JSON.stringify(entry))}
        onChange={(event) =>
          onChange(
            Array.from(
              event.currentTarget.selectedOptions,
              (option) => JSON.parse(option.value) as JsonValue,
            ),
          )
        }
      >
        {(control.options ?? []).map((option) => (
          <option key={JSON.stringify(option.value)} value={JSON.stringify(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (control.type === "object") {
    return <ObjectControl value={value ?? control.default} onChange={onChange} />;
  }

  return (
    <input
      type="text"
      value={typeof value === "string" ? value : String(value ?? "")}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function ObjectControl({
  value,
  onChange,
}: {
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}): ReactElement {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(JSON.stringify(value ?? null, null, 2));
      setInvalid(false);
    }
  }, [focused, value]);

  return (
    <textarea
      className={invalid ? "object-control invalid" : "object-control"}
      aria-label="Object value (JSON)"
      aria-invalid={invalid}
      spellCheck={false}
      rows={Math.min(Math.max(draft.split("\n").length, 3), 10)}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setDraft(next);
        try {
          onChange(JSON.parse(next) as JsonValue);
          setInvalid(false);
        } catch {
          setInvalid(true);
        }
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

function UDimControl({
  control,
  value,
  onChange,
}: {
  control: ControlDefinition;
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}): ReactElement {
  const udim = toUDimControlValue(value, control.default);

  return (
    <div className="dimension-grid udim-grid">
      <NumericTextBox
        ariaLabel="Scale"
        glyph="S"
        value={udim.scale}
        min={control.scaleMin}
        max={control.scaleMax}
        step={control.scaleStep ?? 0.01}
        precision={2}
        onChange={(scale) => onChange(makeUDim(scale, udim.offset))}
      />
      <NumericTextBox
        ariaLabel="Offset"
        glyph="px"
        value={udim.offset}
        min={control.offsetMin}
        max={control.offsetMax}
        step={control.offsetStep ?? 1}
        onChange={(offset) => onChange(makeUDim(udim.scale, offset))}
      />
    </div>
  );
}

function UDim2Control({
  control,
  value,
  onChange,
}: {
  control: ControlDefinition;
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}): ReactElement {
  const udim2 = toUDim2ControlValue(value, control.default);

  return (
    <div className="dimension-grid udim2-grid">
      <NumericTextBox
        ariaLabel="X scale"
        glyph="XS"
        value={udim2.x.scale}
        min={control.scaleMin}
        max={control.scaleMax}
        step={control.scaleStep ?? 0.01}
        precision={2}
        onChange={(scale) => onChange(makeUDim2(makeUDimRaw(scale, udim2.x.offset), udim2.y))}
      />
      <NumericTextBox
        ariaLabel="Y scale"
        glyph="YS"
        value={udim2.y.scale}
        min={control.scaleMin}
        max={control.scaleMax}
        step={control.scaleStep ?? 0.01}
        precision={2}
        onChange={(scale) => onChange(makeUDim2(udim2.x, makeUDimRaw(scale, udim2.y.offset)))}
      />
      <NumericTextBox
        ariaLabel="X offset"
        glyph="X"
        value={udim2.x.offset}
        min={control.offsetMin}
        max={control.offsetMax}
        step={control.offsetStep ?? 1}
        onChange={(offset) => onChange(makeUDim2(makeUDimRaw(udim2.x.scale, offset), udim2.y))}
      />
      <NumericTextBox
        ariaLabel="Y offset"
        glyph="Y"
        value={udim2.y.offset}
        min={control.offsetMin}
        max={control.offsetMax}
        step={control.offsetStep ?? 1}
        onChange={(offset) => onChange(makeUDim2(udim2.x, makeUDimRaw(udim2.y.scale, offset)))}
      />
    </div>
  );
}

function NumericTextBox({
  ariaLabel,
  glyph,
  value,
  min,
  max,
  step = 1,
  precision,
  onChange,
}: {
  ariaLabel: string;
  glyph: string;
  value: number;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  precision?: number | undefined;
  onChange: (value: number) => void;
}): ReactElement {
  const resolvedPrecision = precision ?? precisionFromStep(step);
  const [draft, setDraft] = useState(formatNumericText(value, resolvedPrecision));
  const [focused, setFocused] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const drag = useRef<{ startX: number; startValue: number } | null>(null);

  useEffect(() => {
    if (!focused) {
      setDraft(formatNumericText(value, resolvedPrecision));
    }
  }, [focused, resolvedPrecision, value]);

  function commit(nextValue: number): void {
    const next = clampNumber(roundNumeric(nextValue, resolvedPrecision), min, max);
    setDraft(formatNumericText(next, resolvedPrecision));
    onChange(next);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLSpanElement>): void {
    event.preventDefault();
    const start = { startX: event.clientX, startValue: value };
    drag.current = start;
    setScrubbing(true);
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    const ownerDocument = target.ownerDocument;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      /* pointer capture is best-effort */
    }

    const move = (nativeEvent: globalThis.PointerEvent): void => {
      if (nativeEvent.pointerId !== pointerId) return;
      commit(start.startValue + (nativeEvent.clientX - start.startX) * step);
    };
    const end = (nativeEvent: globalThis.PointerEvent): void => {
      if (nativeEvent.pointerId !== pointerId) return;
      drag.current = null;
      setScrubbing(false);
      ownerDocument.removeEventListener("pointermove", move);
      ownerDocument.removeEventListener("pointerup", end);
      ownerDocument.removeEventListener("pointercancel", end);
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* pointer already released */
      }
    };

    ownerDocument.addEventListener("pointermove", move);
    ownerDocument.addEventListener("pointerup", end);
    ownerDocument.addEventListener("pointercancel", end);
  }

  return (
    <div className={scrubbing ? "cell scrub is-scrubbing" : "cell scrub"}>
      <span
        className="cell-glyph"
        onPointerDown={onPointerDown}
      >
        {glyph}
      </span>
      <input
        aria-label={ariaLabel}
        className="numeric-textbox"
        type="text"
        inputMode="decimal"
        value={draft}
        data-min={min}
        data-max={max}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const nextDraft = event.currentTarget.value;
          setDraft(nextDraft);
          const parsed = parseNumericText(nextDraft);
          if (parsed !== null) {
            onChange(clampNumber(parsed, min, max));
          }
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseNumericText(draft);
          commit(parsed ?? value);
        }}
      />
    </div>
  );
}

function parseNumericText(value: string): number | null {
  if (value.trim() === "" || value === "-" || value === "." || value === "-.") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericText(value: number, precision = 4): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(precision)));
}

function precisionFromStep(step: number): number {
  if (!Number.isFinite(step) || Number.isInteger(step)) return 0;
  const decimal = String(step).split(".")[1];
  return Math.min(decimal?.length ?? 4, 4);
}

function roundNumeric(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clampNumber(value: number, min?: number, max?: number): number {
  const minClamped = min == null ? value : Math.max(min, value);
  return max == null ? minClamped : Math.min(max, minClamped);
}

function makeUDimRaw(scale: number, offset: number): RobloxUDim {
  return {
    $type: "UDim",
    scale,
    offset,
  };
}

function makeUDim(scale: number, offset: number): JsonValue {
  return makeUDimRaw(scale, offset) as unknown as JsonValue;
}

function makeUDim2(x: RobloxUDim, y: RobloxUDim): JsonValue {
  return {
    $type: "UDim2",
    x,
    y,
  } as unknown as JsonValue;
}

function toUDimControlValue(value: JsonValue | undefined, fallback: JsonValue): RobloxUDim {
  if (isRecord(value) && value.$type === "UDim") {
    return makeUDimRaw(numberValue(value.scale, 0), numberValue(value.offset, 0));
  }

  if (isRecord(fallback) && fallback.$type === "UDim") {
    return makeUDimRaw(numberValue(fallback.scale, 0), numberValue(fallback.offset, 0));
  }

  return makeUDimRaw(0, 0);
}

function toUDim2ControlValue(
  value: JsonValue | undefined,
  fallback: JsonValue,
): { x: RobloxUDim; y: RobloxUDim } {
  if (isRecord(value) && value.$type === "UDim2") {
    return {
      x: toUDimControlValue(value.x as JsonValue | undefined, makeUDim(0, 0)),
      y: toUDimControlValue(value.y as JsonValue | undefined, makeUDim(0, 0)),
    };
  }

  if (isRecord(fallback) && fallback.$type === "UDim2") {
    return {
      x: toUDimControlValue(fallback.x as JsonValue | undefined, makeUDim(0, 0)),
      y: toUDimControlValue(fallback.y as JsonValue | undefined, makeUDim(0, 0)),
    };
  }

  return {
    x: makeUDimRaw(0, 0),
    y: makeUDimRaw(0, 0),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function defaultControlValues(controls: Record<string, ControlDefinition>): ControlValues {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => [key, control.default]),
  );
}
