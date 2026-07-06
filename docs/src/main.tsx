import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import "./styles.css";

const defaultStoryCode = `local UI = require("@ui-claps/adapter")

return {
  name = "Primary Button",
  controls = {
    text = UI.control.string("Play", {
      label = "Text",
      description = "Button label shown in the preview.",
    }),
    accent = UI.control.color(Color3.fromRGB(0, 170, 255), {
      label = "Color",
      description = "Button BackgroundColor3.",
    }),
    size = UI.control.udim2(UDim2.fromOffset(220, 56), {
      label = "Size",
      offsetMin = 36,
      offsetMax = 360,
      offsetStep = 4,
    }),
    cornerRadius = UI.control.udim(UDim.new(0, 10), {
      label = "Radius",
      offsetMin = 0,
      offsetMax = 28,
      offsetStep = 1,
    }),
  },
  render = function(props)
    return UI.create("TextButton", {
      Name = "PrimaryButton",
      Size = props.size,
      Text = props.text,
      BackgroundColor3 = props.accent,
      TextColor3 = Color3.fromRGB(255, 255, 255),
    }, {
      UI.create("UICorner", {
        CornerRadius = props.cornerRadius,
      }),
    })
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
    <>
      <SiteNav />
      <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Roblox UI story previews</p>
          <h1>Build Roblox UI stories. Preview them in a browser.</h1>
          <p className="lede">
            StoryBlox runs your Luau and roblox-ts stories through Zune and renders the result
            next to the code that owns it — controls, Rovy surfaces and all.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#start">
              Get started
            </a>
            <a className="btn btn-quiet" href="/storyblox/api/">
              API reference
            </a>
            <a className="btn btn-quiet" href="https://github.com/CapedBojji/storyblox">
              GitHub
            </a>
          </div>
        </div>
        <div className="preview-shell" aria-label="StoryBlox preview mockup">
          <div className="preview-titlebar">
            <span className="traffic tinted">
              <i />
              <i />
              <i />
            </span>
            <span>StoryBlox — RobloxUI</span>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <span className="tree-label">RobloxUI</span>
              <span className="tree-item active">
                <i className="dot pink" />
                Primary Button
              </span>
              <span className="tree-item">
                <i className="dot teal" />
                Tool Window
              </span>
              <span className="tree-item">
                <i className="dot orange" />
                Inventory Panel
              </span>
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
        </div>
      </section>

      <section className="demo-band">
        <div className="band-inner">
          <div className="section-heading">
            <p className="eyebrow">Live demo</p>
            <h2>Edit a Roblox story and see the preview update.</h2>
            <p>
              Change the story below. Valid edits update the preview immediately; invalid edits
              keep the last good preview and show the parser error.
            </p>
          </div>
          <StoryEditorDemo />
        </div>
      </section>

      <section id="start" className="band">
        <div className="band-inner">
          <div>
            <p className="eyebrow">Install</p>
            <h2>Run a local story browser.</h2>
            <p>
              StoryBlox discovers <code>.story.luau</code> modules, evaluates them through Zune,
              and serializes the returned Roblox UI tree into a browser preview.
            </p>
          </div>
          <CodeBlock code={`pnpm install\npnpm run dev\n\nstoryblox dev ./path/to/project`} />
        </div>
      </section>

      <section className="split">
        <div className="split-inner">
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
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <div>
            <p className="eyebrow">First-party Rovy</p>
            <h2>Preview Rovy/Vide and Rovy UI without custom glue.</h2>
            <p>
              Use <code>rovyVide.story(...)</code> for view mounting through{" "}
              <code>@rovy/vide</code>, or <code>rovy.story(...)</code> when you need app creation,
              runtime selection, roots, and cleanup in one place.
            </p>
          </div>
          <div className="code-grid">
            <CodeBlock title="Rovy/Vide" code={rovyVideStory} />
            <CodeBlock title="Rovy UI" code={rovyUiStory} />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <div>
            <p className="eyebrow">Reference</p>
            <h2>Need the full surface area?</h2>
            <p>
              The API reference lives on its own page with story, adapter, control, config, and
              Rovy details.
            </p>
          </div>
          <div className="reference-link-panel">
            <a className="btn btn-primary" href="/storyblox/api/">
              Open API reference
            </a>
          </div>
        </div>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SiteNav() {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <a className="wordmark" href="/storyblox/">
          <i />
          StoryBlox
        </a>
        <nav className="site-nav-links">
          <a href="#start">Get started</a>
          <a href="/storyblox/api/">API</a>
          <a href="https://github.com/CapedBojji/storyblox">GitHub</a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>StoryBlox — Roblox UI story previews</span>
        <a href="https://github.com/CapedBojji/storyblox">GitHub</a>
      </div>
    </footer>
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

  function patchCode(pattern: RegExp, replacement: string) {
    updateCode(code.replace(pattern, replacement));
  }

  function setText(value: string) {
    patchCode(
      /text\s*=\s*UI\.control\.string\("[^"]*"/,
      `text = UI.control.string("${value.replace(/[\\"]/g, "")}"`,
    );
  }

  function setBackground(hex: string) {
    const [r, g, b] = hexToRgbChannels(hex);
    patchCode(
      /accent\s*=\s*UI\.control\.color\(Color3\.fromRGB\([^)]*\)/,
      `accent = UI.control.color(Color3.fromRGB(${r}, ${g}, ${b})`,
    );
  }

  function setSize(width: number, height: number) {
    patchCode(
      /size\s*=\s*UI\.control\.udim2\(UDim2\.fromOffset\([^)]*\)/,
      `size = UI.control.udim2(UDim2.fromOffset(${width}, ${height})`,
    );
  }

  function setRadius(value: number) {
    patchCode(
      /cornerRadius\s*=\s*UI\.control\.udim\(UDim\.new\(0\s*,\s*[-\d.]+\)/,
      `cornerRadius = UI.control.udim(UDim.new(0, ${value})`,
    );
  }

  return (
    <div className="editor-demo">
      <div className="editor-pane">
        <div className="editor-toolbar">
          <span className="traffic">
            <i />
            <i />
            <i />
          </span>
          <span className="file-name">PrimaryButton.story.luau</span>
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
          <span>
            {preview.width} × {preview.height}
          </span>
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
        <fieldset
          className="story-controls"
          disabled={error !== null}
          aria-label="Story controls"
        >
          <label className="control">
            <span>text</span>
            <input
              type="text"
              value={preview.text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <label className="control">
            <span>color</span>
            <input
              type="color"
              value={rgbToHex(preview.background)}
              onChange={(event) => setBackground(event.target.value)}
            />
          </label>
          <label className="control">
            <span>width · {preview.width}px</span>
            <input
              type="range"
              min={96}
              max={360}
              value={preview.width}
              onChange={(event) => setSize(Number(event.target.value), preview.height)}
            />
          </label>
          <label className="control">
            <span>height · {preview.height}px</span>
            <input
              type="range"
              min={36}
              max={120}
              value={preview.height}
              onChange={(event) => setSize(preview.width, Number(event.target.value))}
            />
          </label>
          <label className="control">
            <span>radius · {preview.radius}px</span>
            <input
              type="range"
              min={0}
              max={28}
              value={preview.radius}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
          </label>
        </fieldset>
      </div>
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+) (\d+) (\d+)\)/);
  if (!match) return "#00aaff";
  return `#${match
    .slice(1, 4)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgbChannels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function parseStory(source: string): DemoStory {
  if (!/controls\s*=\s*{/.test(source)) {
    throw new Error("Expected a controls table in the story.");
  }
  if (!/render\s*=\s*function\s*\(\s*props\s*\)/.test(source)) {
    throw new Error("Expected render = function(props) in the story.");
  }
  if (!/UI\.create\("TextButton"/.test(source)) {
    throw new Error("This demo expects UI.create(\"TextButton\").");
  }

  const size = readPair(source, "size control", /size\s*=\s*UI\.control\.udim2\(UDim2\.fromOffset\(([-\d.]+)\s*,\s*([-\d.]+)\)/);
  const background = readColor(source, "accent control", /accent\s*=\s*UI\.control\.color\(Color3\.fromRGB\(([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\)/);
  const textColor = readColor(source, "TextColor3", /TextColor3\s*=\s*Color3\.fromRGB\(([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\)/);

  return {
    name: readString(source, "name", /name\s*=\s*"([^"]*)"/),
    text: readString(source, "text control", /text\s*=\s*UI\.control\.string\("([^"]*)"/),
    width: clamp(size[0], 96, 360),
    height: clamp(size[1], 36, 120),
    background,
    textColor,
    radius: clamp(readNumber(source, "cornerRadius control", /cornerRadius\s*=\s*UI\.control\.udim\(UDim\.new\(0\s*,\s*([-\d.]+)\)/), 0, 28),
  };
}

function readString(source: string, label: string, pattern: RegExp): string {
  const match = source.match(pattern);
  if (match?.[1] === undefined) throw new Error(`Missing ${label}.`);
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
