import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { ControlDefinition, JsonValue, ProjectManifest, RenderResponse, StoryManifest } from "../shared/types";
import { fetchProject, renderStory } from "./api";
import { RobloxRenderer } from "./renderer/RobloxRenderer";
import { collectRendererWarnings } from "./renderer/warnings";
import { color3ToHex, hexToColor3 } from "./renderer/style";

type ControlValues = Record<string, JsonValue>;

export function App(): ReactElement {
  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controls, setControls] = useState<ControlValues>({});
  const [rendered, setRendered] = useState<RenderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadProject();
  }, []);

  const selectedStory = useMemo(
    () => project?.stories.find((story) => story.id === selectedId) ?? project?.stories[0] ?? null,
    [project, selectedId],
  );

  useEffect(() => {
    if (!selectedStory) return;
    setSelectedId(selectedStory.id);
    setControls(defaultControlValues(selectedStory.controls));
  }, [selectedStory?.id]);

  useEffect(() => {
    if (!selectedStory) return;
    void runRender(selectedStory, controls);
  }, [selectedStory?.id, JSON.stringify(controls)]);

  const rendererWarnings = useMemo(
    () => (rendered?.tree ? collectRendererWarnings(rendered.tree) : []),
    [rendered?.tree],
  );

  const groupedStories = useMemo(() => {
    const groups = new Map<string, StoryManifest[]>();
    for (const story of project?.stories ?? []) {
      const existing = groups.get(story.group) ?? [];
      existing.push(story);
      groups.set(story.group, existing);
    }
    return groups;
  }, [project?.stories]);

  async function loadProject(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const nextProject = await fetchProject();
      setProject(nextProject);
      setSelectedId((current) => current ?? nextProject.stories[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>UI Claps</h1>
            <p>{project ? `${project.stories.length} stories` : "Loading stories"}</p>
          </div>
          <button className="icon-button" type="button" onClick={() => void loadProject()} title="Refresh stories">
            ↻
          </button>
        </div>

        <nav className="story-list" aria-label="Stories">
          {loading ? <div className="empty-state">Scanning project...</div> : null}
          {!loading && project?.stories.length === 0 ? (
            <div className="empty-state">No stories found.</div>
          ) : null}
          {Array.from(groupedStories.entries()).map(([group, stories]) => (
            <section className="story-group" key={group}>
              <h2>{group}</h2>
              {stories.map((story) => (
                <button
                  className={story.id === selectedStory?.id ? "story-link active" : "story-link"}
                  key={story.id}
                  type="button"
                  onClick={() => setSelectedId(story.id)}
                >
                  <span>{story.name}</span>
                  <small>{story.relativePath}</small>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h2>{selectedStory?.name ?? "No story selected"}</h2>
            <p>{selectedStory?.relativePath ?? "Create a .story.luau file to begin."}</p>
          </div>
          <div className={rendering ? "status-dot busy" : "status-dot"}>{rendering ? "Rendering" : "Ready"}</div>
        </header>

        <section className="preview-band">
          <div className="preview-surface">
            {rendered?.tree ? <RobloxRenderer node={rendered.tree} isRoot /> : null}
            {rendered?.error ? (
              <div className="preview-message error-message">{rendered.error.message}</div>
            ) : null}
            {!rendered && !rendering && !error ? (
              <div className="preview-message">Select a story to render it.</div>
            ) : null}
            {error ? <div className="preview-message error-message">{error}</div> : null}
          </div>
        </section>
      </main>

      <aside className="inspector">
        <section className="panel">
          <h2>Controls</h2>
          {selectedStory && Object.keys(selectedStory.controls).length > 0 ? (
            <ControlPanel
              controls={selectedStory.controls}
              values={controls}
              onChange={(key, value) => setControls((current) => ({ ...current, [key]: value }))}
            />
          ) : (
            <p className="muted">This story has no controls.</p>
          )}
        </section>

        <section className="panel">
          <h2>Warnings</h2>
          <WarningList
            warnings={[
              ...(project?.warnings ?? []),
              ...(rendered?.warnings ?? []),
              ...rendererWarnings,
            ]}
          />
        </section>
      </aside>
    </div>
  );
}

function ControlPanel({
  controls,
  values,
  onChange,
}: {
  controls: Record<string, ControlDefinition>;
  values: ControlValues;
  onChange: (key: string, value: JsonValue) => void;
}): ReactElement {
  return (
    <div className="controls-list">
      {Object.entries(controls).map(([key, control]) => (
        <label className="control-row" key={key}>
          <span>{control.label ?? key}</span>
          <ControlInput
            control={control}
            value={values[key] ?? control.default}
            onChange={(value) => onChange(key, value)}
          />
        </label>
      ))}
    </div>
  );
}

function ControlInput({
  control,
  value,
  onChange,
}: {
  control: ControlDefinition;
  value: JsonValue;
  onChange: (value: JsonValue) => void;
}): ReactElement {
  if (control.type === "boolean") {
    return (
      <input
        checked={value === true}
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }

  if (control.type === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : Number(control.default) || 0}
        min={control.min}
        max={control.max}
        step={control.step}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    );
  }

  if (control.type === "slider") {
    const numericValue = typeof value === "number" ? value : Number(control.default) || 0;
    return (
      <div className="slider-control">
        <input
          type="range"
          value={numericValue}
          min={control.min ?? 0}
          max={control.max ?? 100}
          step={control.step ?? 1}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <input
          type="number"
          value={numericValue}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
      </div>
    );
  }

  if (control.type === "color") {
    return (
      <input
        type="color"
        value={color3ToHex(value)}
        onChange={(event) => onChange(hexToColor3(event.currentTarget.value) as unknown as JsonValue)}
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

  return (
    <input
      type="text"
      value={typeof value === "string" ? value : String(value ?? "")}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function WarningList({ warnings }: { warnings: string[] }): ReactElement {
  if (warnings.length === 0) {
    return <p className="muted">No warnings.</p>;
  }

  return (
    <ul className="warnings-list">
      {Array.from(new Set(warnings)).map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );
}

function defaultControlValues(controls: Record<string, ControlDefinition>): ControlValues {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => [key, control.default]),
  );
}
