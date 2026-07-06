import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "./styles.css";

const plainStory = `return {
  name = "Primary Button",
  render = function()
    local button = Instance.new("TextButton")
    button.Name = "PrimaryButton"
    button.Size = UDim2.fromOffset(180, 44)
    button.Text = "Click me"
    button.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = button

    return button
  end,
}`;

const adapterStory = `local UI = require("@ui-claps/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Click me"),
    disabled = UI.control.boolean(false),
    accent = UI.control.color(Color3.fromRGB(0, 170, 255)),
  },
  render = function(props)
    return UI.create("TextButton", {
      Text = props.text,
      Active = not props.disabled,
      BackgroundColor3 = props.accent,
    })
  end,
}`;

const rovyVideStory = `import type { RovyVideStory } from "storyblox/rovy-vide";
import { RootView } from "client/ui/RootView";

const story: RovyVideStory = UIClaps.rovyVide.story({
  name: "Inventory Panel",
  view: RootView,
  bootstrap: () => createApp(),
});

export = story;`;

const rovyUiStory = `import type { RovyStory } from "storyblox/rovy";

const story: RovyStory = UIClaps.rovy.story({
  name: "Tool Window",
  runtime: "rovy-ui",
  app: () => bootTemplateApp(),
  render: (ctx) => {
    return () => {
      ctx.runtime.rovyUi.window("Tools", () => {
        ctx.runtime.rovyUi.label("Hello from Rovy UI");
      });
    };
  },
});

export = story;`;

function App() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Roblox UI story previews</p>
          <h1>StoryBlox</h1>
          <p className="lede">
            Build Roblox UI stories in Luau or roblox-ts, preview them in a browser, and keep Rovy
            app surfaces close to the code that owns them.
          </p>
          <div className="hero-actions">
            <a href="#start">Get started</a>
            <a href="https://github.com/CapedBojji/storyblox">GitHub</a>
          </div>
        </div>
        <div className="preview-shell" aria-label="StoryBlox preview mockup">
          <div className="preview-sidebar">
            <span>RobloxUI</span>
            <strong>Primary Button</strong>
            <span>Rovy / Tool Window</span>
            <span>Controls / Colors</span>
          </div>
          <div className="preview-canvas">
            <div className="roblox-button">Click me</div>
            <div className="knobs">
              <span>text</span>
              <span>accent</span>
              <span>disabled</span>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-band">
        <div className="section-heading">
          <p className="eyebrow">Live demo</p>
          <h2>Adjust controls and watch the story change.</h2>
          <p>
            This browser demo mirrors the StoryBlox control loop: props change, the story rerenders,
            and the Roblox-style preview updates immediately.
          </p>
        </div>
        <LiveDemo />
      </section>

      <section id="start" className="band">
        <div>
          <p className="eyebrow">Install</p>
          <h2>Run a local story browser.</h2>
          <p>
            StoryBlox discovers `.story.luau` modules, evaluates them through Zune, and serializes
            the returned Roblox UI tree into a browser preview.
          </p>
        </div>
        <CodeBlock code={`pnpm install\npnpm run dev\n\nstoryblox dev ./path/to/project`} />
      </section>

      <section className="split">
        <Article
          title="Adapter optional"
          body="Plain stories can create Roblox instances directly. Use the adapter when you want compact tree creation and first-class controls."
          code={plainStory}
        />
        <Article
          title="Controls included"
          body="The adapter helpers define typed control defaults for strings, booleans, sliders, colors, UDim, UDim2, selects, and objects."
          code={adapterStory}
        />
      </section>

      <section className="band rovy">
        <div>
          <p className="eyebrow">First-party Rovy</p>
          <h2>Preview Rovy/Vide and Rovy UI without custom glue.</h2>
          <p>
            Use `rovyVide.story(...)` for view mounting through `@rovy/vide`, or `rovy.story(...)`
            when you need app creation, runtime selection, roots, and cleanup in one place.
          </p>
        </div>
        <div className="code-grid">
          <CodeBlock title="Rovy/Vide" code={rovyVideStory} />
          <CodeBlock title="Rovy UI" code={rovyUiStory} />
        </div>
      </section>

      <section className="api-section" id="api">
        <div className="section-heading">
          <p className="eyebrow">API reference</p>
          <h2>What StoryBlox exposes.</h2>
          <p>
            These are the public story shapes, adapter helpers, controls, config fields, and Rovy
            helpers available to stories today.
          </p>
        </div>

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
          ]}
        />
      </section>
    </main>
  );
}

function LiveDemo() {
  const [text, setText] = useState("Play");
  const [accent, setAccent] = useState("#00aaff");
  const [width, setWidth] = useState(210);
  const [rounded, setRounded] = useState(true);
  const [disabled, setDisabled] = useState(false);

  return (
    <div className="demo-panel">
      <div className="demo-stage">
        <div
          className={disabled ? "demo-button disabled" : "demo-button"}
          style={{
            width,
            backgroundColor: disabled ? "#9aa5ad" : accent,
            borderRadius: rounded ? 10 : 2,
          }}
        >
          {text || "Button"}
        </div>
      </div>
      <div className="demo-controls" aria-label="Interactive story controls">
        <label>
          <span>Text</span>
          <input value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label>
          <span>Accent</span>
          <input
            type="color"
            value={accent}
            onChange={(event) => setAccent(event.target.value)}
          />
        </label>
        <label>
          <span>Width</span>
          <input
            type="range"
            min="120"
            max="320"
            step="4"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={rounded}
            onChange={(event) => setRounded(event.target.checked)}
          />
          <span>Rounded corners</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          <span>Disabled</span>
        </label>
      </div>
    </div>
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

function Article({ title, body, code }: { title: string; body: string; code: string }) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{body}</p>
      <CodeBlock code={code} />
    </article>
  );
}

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="code-block">
      {title ? <div className="code-title">{title}</div> : null}
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
