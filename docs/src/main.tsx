import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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
    </main>
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
