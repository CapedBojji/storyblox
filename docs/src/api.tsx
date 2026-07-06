import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import "./styles.css";

function ApiPage() {
  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <a className="wordmark" href="/storyblox/">
            <i />
            StoryBlox
          </a>
          <nav className="site-nav-links">
            <a href="/storyblox/">Home</a>
            <a href="https://github.com/CapedBojji/storyblox">GitHub</a>
          </nav>
        </div>
      </header>
      <main>
      <section className="api-hero">
        <p className="eyebrow">API reference</p>
        <h1>StoryBlox API</h1>
        <p className="lede">
          Public story shapes, adapter helpers, controls, config fields, and first-party Rovy
          helpers exposed by StoryBlox today.
        </p>
      </section>

      <section className="api-section">
        <div className="api-inner">
        <ApiGroup
          title="Story module"
          items={[
            ["name", "Optional display name for the story."],
            ["controls", "Optional table of control definitions used to build the controls panel."],
            ["render(props)", "Required for plain stories. Returns a Roblox Instance tree, an array of Instances, or a UI.create tree."],
          ]}
        />

        <ApiGroup
          title="Adapter"
          items={[
            ["UI.create(className, props?, children?)", "Creates a serializable Roblox UI node for previews."],
            ["UI.control.*", "Creates control definitions with defaults, labels, descriptions, ranges, and options."],
            ["UI.rovy.story(config)", "Creates a first-party Rovy story with app, runtime, render, and cleanup hooks."],
            ["UI.rovyVide.story(config)", "Creates a first-party Rovy/Vide story that mounts a view through @rovy/vide."],
          ]}
        />

        <ApiGroup
          title="Controls"
          items={[
            ["string(default?, options?)", "Text input control."],
            ["boolean(default?, options?)", "Toggle control."],
            ["number(default?, options?)", "Numeric input with optional min, max, and step."],
            ["slider(default?, min?, max?, step?, options?)", "Range slider with a paired numeric value."],
            ["color(default?, options?)", "Color picker backed by Roblox Color3 values."],
            ["select(default, options)", "Single-select dropdown using labeled options."],
            ["radio(default, options)", "Single-select radio group."],
            ["check(default, options)", "Checkbox group for multiple selections."],
            ["multiselect(default, options)", "Multi-select list control."],
            ["object(default, options?)", "JSON-like object editor for structured props."],
            ["udim(default?, options?)", "Roblox UDim editor with scale and offset fields."],
            ["udim2(default?, options?)", "Roblox UDim2 editor with X/Y scale and offset fields."],
          ]}
        />

        <ApiGroup
          title="Control options"
          items={[
            ["label", "Optional display label shown in the controls panel."],
            ["description", "Optional help text shown alongside the control."],
            ["min, max, step", "Numeric bounds and increments for number and slider controls."],
            ["scaleMin, scaleMax, scaleStep", "Scale bounds and increments for UDim and UDim2 controls."],
            ["offsetMin, offsetMax, offsetStep", "Offset bounds and increments for UDim and UDim2 controls."],
            ["options", "Labeled option list for select, radio, check, and multiselect controls."],
            ["inline", "Optional compact layout hint for option controls."],
          ]}
        />

        <ApiGroup
          title="Config"
          items={[
            ["root", "Project source root."],
            ["storyRoot", "Directory StoryBlox searches for compiled .story.luau files. Defaults to root."],
            ["rojoProject", "Rojo project file used to resolve modules and Roblox services."],
            ["zuneCommand", "Optional executable path or command name for Zune."],
          ]}
        />

        <ApiGroup
          title="Rovy"
          items={[
            ["rovyVide.story({ view, bootstrap, controls? })", "Bootstraps an app, mounts the view into the preview target, flushes the app when supported, and cleans up the mount handle."],
            ["rovy.story({ app, runtime?, render, cleanup?, controls? })", "Creates an app context, prepares the selected runtime, renders Instances or callbacks, then runs cleanup."],
            ["runtime: \"rovy-ui\"", "Creates a default @rovy/ui root and allows render to return a frame callback."],
            ["runtime: { kind: \"rovy-ui\", roots }", "Uses custom Rovy UI root Instances."],
            ["runtime: function(ctx)", "Supplies a custom runtime value on ctx.runtime."],
            ["cleanup(ctx)", "Optional cleanup hook that runs after registered cleanup callbacks."],
          ]}
        />
        </div>
      </section>
      </main>
    </>
  );
}

function ApiGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <article className="api-group">
      <h3>{title}</h3>
      <dl>
        {items.map(([name, description]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

createRoot(root).render(
  <StrictMode>
    <ApiPage />
  </StrictMode>,
);
