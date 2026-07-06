import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "./styles.css";

const defaultStoryCode = `return {
  name = "Primary Button",
  render = function()
    local button = Instance.new("TextButton")
    button.Name = "PrimaryButton"
    button.Size = UDim2.fromOffset(220, 56)
    button.Text = "Play"
    button.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 10)
    corner.Parent = button

    return button
  end,
}`;

interface DemoStory {
  name: string;
  text: string;
  width: number;
  height: number;
  background: string;
  textColor: string;
  radius: number;
}

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
            <a href="/storyblox/api/">API reference</a>
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
          <h2>Edit a Roblox story and see the preview update.</h2>
          <p>
            Change the single story below. Valid edits update the preview immediately; invalid edits
            keep the last good preview and show the parser error.
          </p>
        </div>
        <StoryEditorDemo />
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

      <section className="band">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>Need the full surface area?</h2>
          <p>The API reference now lives on its own page with story, adapter, control, config, and Rovy details.</p>
        </div>
        <div className="reference-link-panel">
          <a href="/storyblox/api/">Open API reference</a>
        </div>
      </section>
    </main>
  );
}

function StoryEditorDemo() {
  const initialStory = parseStory(defaultStoryCode);
  const [code, setCode] = useState(defaultStoryCode);
  const [preview, setPreview] = useState<DemoStory>(initialStory);
  const [error, setError] = useState<string | null>(null);

  function updateCode(nextCode: string) {
    setCode(nextCode);
    try {
      setPreview(parseStory(nextCode));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Story could not be parsed.");
    }
  }

  function resetCode() {
    setCode(defaultStoryCode);
    setPreview(initialStory);
    setError(null);
  }

  return (
    <div className="editor-demo">
      <div className="editor-pane">
        <div className="editor-toolbar">
          <span>PrimaryButton.story.luau</span>
          <button type="button" onClick={resetCode}>
            Reset
          </button>
        </div>
        <textarea
          spellCheck={false}
          value={code}
          onChange={(event) => updateCode(event.target.value)}
          aria-label="Editable Roblox story code"
        />
        <div className={error ? "editor-status error" : "editor-status"}>
          {error ?? "Story parsed. Preview is up to date."}
        </div>
      </div>
      <div className="story-preview-pane">
        <div className="story-preview-header">
          <span>{preview.name}</span>
          <span>{preview.width} x {preview.height}</span>
        </div>
        <div className="story-preview-stage">
        <button
          type="button"
          className="demo-button"
          style={{
            width: preview.width,
            minHeight: preview.height,
            backgroundColor: preview.background,
            borderRadius: preview.radius,
            color: preview.textColor,
          }}
        >
          {preview.text}
        </button>
      </div>
      </div>
    </div>
  );
}

function parseStory(source: string): DemoStory {
  if (!/render\s*=\s*function\s*\(\)/.test(source)) {
    throw new Error("Expected render = function() in the story.");
  }
  if (!/Instance\.new\("TextButton"\)/.test(source)) {
    throw new Error("This demo expects Instance.new(\"TextButton\").");
  }
  if (!/return\s+button/.test(source)) {
    throw new Error("Expected the story to return button.");
  }

  const width = readPair(source, "Size", /button\.Size\s*=\s*UDim2\.fromOffset\(([-\d.]+)\s*,\s*([-\d.]+)\)/);
  const background = readColor(source, "BackgroundColor3", /button\.BackgroundColor3\s*=\s*Color3\.fromRGB\(([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\)/);
  const textColor = readColor(source, "TextColor3", /button\.TextColor3\s*=\s*Color3\.fromRGB\(([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\)/);

  return {
    name: readString(source, "name", /name\s*=\s*"([^"]*)"/),
    text: readString(source, "Text", /button\.Text\s*=\s*"([^"]*)"/),
    width: clamp(width[0], 96, 360),
    height: clamp(width[1], 36, 120),
    background,
    textColor,
    radius: clamp(readNumber(source, "CornerRadius", /corner\.CornerRadius\s*=\s*UDim\.new\(0\s*,\s*([-\d.]+)\)/), 0, 28),
  };
}

function readString(source: string, label: string, pattern: RegExp): string {
  const match = source.match(pattern);
  if (!match?.[1]) throw new Error(`Missing ${label}.`);
  return match[1];
}

function readPair(source: string, label: string, pattern: RegExp): [number, number] {
  const match = source.match(pattern);
  if (!match?.[1] || !match[2]) throw new Error(`Missing ${label}.`);
  return [toNumber(match[1], label), toNumber(match[2], label)];
}

function readColor(source: string, label: string, pattern: RegExp): string {
  const match = source.match(pattern);
  if (!match?.[1] || !match[2] || !match[3]) throw new Error(`Missing ${label}.`);
  const channels = [toNumber(match[1], label), toNumber(match[2], label), toNumber(match[3], label)];
  if (channels.some((channel) => channel < 0 || channel > 255)) {
    throw new Error(`${label} values must be between 0 and 255.`);
  }
  return `rgb(${channels.join(" ")})`;
}

function readNumber(source: string, label: string, pattern: RegExp): number {
  const match = source.match(pattern);
  if (!match?.[1]) throw new Error(`Missing ${label}.`);
  return toNumber(match[1], label);
}

function toNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
