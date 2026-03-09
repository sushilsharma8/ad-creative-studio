import { supabase } from "@/integrations/supabase/client";

export interface GenerateAdsParams {
  project_id: string;
  prompt: string;
  knowledge_base?: string;
  ref_vertical?: string;
  output_count?: number;
  image_model?: string;
  text_model?: string;
  modes?: { trending: boolean; reddit: boolean; imageStyles: boolean };
  seed_image_urls?: string[];
  inspiration_image_urls?: string[];
}

export type StageStatus = "pending" | "running" | "done";

export interface StageUpdate {
  stage: string;
  status: StageStatus;
  data?: any;
  index?: number;
}

export interface AssetUpdate {
  asset: any;
  index: number;
}

export interface GenerateCallbacks {
  onStage: (update: StageUpdate) => void;
  onAsset: (update: AssetUpdate) => void;
  onDone: (data: { generation_id: string; completed: number; total: number }) => void;
  onError: (message: string) => void;
}

export async function generateAds(params: GenerateAdsParams, callbacks: GenerateCallbacks) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ads`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      callbacks.onError(json.error || "Generation failed");
    } catch {
      callbacks.onError(`Generation failed (${resp.status})`);
    }
    return;
  }

  if (!resp.body) {
    callbacks.onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 2);

      let eventType = "message";
      let eventData = "";

      for (const line of chunk.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6).trim();
        }
      }

      if (!eventData) continue;

      try {
        const parsed = JSON.parse(eventData);

        switch (eventType) {
          case "stage":
            callbacks.onStage(parsed);
            break;
          case "asset":
            callbacks.onAsset(parsed);
            break;
          case "done":
            callbacks.onDone(parsed);
            break;
          case "error":
            callbacks.onError(parsed.message || "Unknown error");
            break;
        }
      } catch {
        // Ignore unparseable chunks
      }
    }
  }
}
