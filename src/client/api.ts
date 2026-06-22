import type { ProjectManifest, RenderRequest, RenderResponse } from "../shared/types";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;

  if (!response.ok) {
    const errorPayload = payload as { message?: string; details?: string };
    throw new Error(errorPayload.message ?? response.statusText);
  }

  return payload;
}

export async function fetchProject(): Promise<ProjectManifest> {
  return readJson<ProjectManifest>(await fetch("/api/project"));
}

export async function renderStory(request: RenderRequest): Promise<RenderResponse> {
  return readJson<RenderResponse>(
    await fetch("/api/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }),
  );
}
