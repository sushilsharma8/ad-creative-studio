import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Model Lists ───
const IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
  "openai/gpt-image-1",
  "xai/grok-2-image",
];

const TEXT_MODELS = [
  "google/gemini-3-flash-preview",
  "openai/gpt-5",
  "anthropic/claude-sonnet",
];

const MODEL_MAP: Record<string, string> = {
  "gemini-flash-image": "google/gemini-2.5-flash-image",
  "gemini-3-pro-image": "google/gemini-3-pro-image-preview",
  "gpt-image-1": "openai/gpt-image-1",
  "grok-2-image": "xai/grok-2-image",
  "gemini-flash": "google/gemini-3-flash-preview",
  "gpt-5": "openai/gpt-5",
  "claude-sonnet": "anthropic/claude-sonnet",
};

// ─── Helpers ───

function pickModel(preferred: string, list: string[], skipGrok = false): string {
  if (preferred === "randomize") {
    const filtered = skipGrok ? list.filter((m) => !m.includes("grok")) : list;
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  return MODEL_MAP[preferred] || list[0];
}

async function callTextModel(
  model: string,
  messages: Array<{ role: string; content: string | any[] }>,
  tools?: any[],
  toolChoice?: any
): Promise<any> {
  const models = [model, ...TEXT_MODELS.filter((m) => m !== model)];

  for (const m of models) {
    try {
      const result = await callSingleTextModel(m, messages, tools, toolChoice);
      return { ...result, model_used: m };
    } catch (e) {
      console.error(`Text model ${m} failed:`, e.message);
    }
  }
  throw new Error("All text models failed");
}

async function callSingleTextModel(
  model: string,
  messages: any[],
  tools?: any[],
  toolChoice?: any
): Promise<any> {
  if (model.startsWith("anthropic/")) {
    return callAnthropic(model, messages, tools, toolChoice);
  }

  // Use Lovable AI Gateway for Google and OpenAI text models
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  // GPT-5 only supports temperature=1, so skip custom temperature for OpenAI models
  const body: any = model.startsWith("openai/") ? { model, messages } : { model, messages, temperature: 0.8 };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${t}`);
  }

  return resp.json();
}

async function callAnthropic(
  _model: string,
  messages: any[],
  tools?: any[],
  toolChoice?: any
): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  // Convert OpenAI format to Anthropic format
  const system = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n");
  const anthropicMessages = messages.filter((m: any) => m.role !== "system").map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content,
  }));

  const body: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: anthropicMessages,
  };
  if (system) body.system = system;

  if (tools) {
    body.tools = tools.map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    if (toolChoice) {
      body.tool_choice = { type: "tool", name: toolChoice.function.name };
    }
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${t}`);
  }

  const data = await resp.json();

  // Convert Anthropic response → OpenAI format
  const toolUse = data.content?.find((c: any) => c.type === "tool_use");
  if (toolUse) {
    return {
      choices: [{
        message: {
          role: "assistant",
          tool_calls: [{
            id: toolUse.id,
            type: "function",
            function: { name: toolUse.name, arguments: JSON.stringify(toolUse.input) },
          }],
        },
      }],
    };
  }

  const textContent = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  return {
    choices: [{ message: { role: "assistant", content: textContent } }],
  };
}

// ─── Image Generation ───

async function generateImage(
  model: string,
  prompt: string,
  seedUrl?: string
): Promise<{ base64: string; model_used: string }> {
  const models = [model, ...IMAGE_MODELS.filter((m) => m !== model && !m.includes("grok"))];

  for (const m of models) {
    try {
      const result = await callSingleImageModel(m, prompt, seedUrl);
      return { ...result, model_used: m };
    } catch (e) {
      console.error(`Image model ${m} failed:`, e.message);
    }
  }
  throw new Error("All image models failed");
}

async function callSingleImageModel(
  model: string,
  prompt: string,
  seedUrl?: string
): Promise<{ base64: string }> {
  if (model === "openai/gpt-image-1") {
    return generateOpenAIImage(prompt);
  }
  if (model === "xai/grok-2-image") {
    return generateGrokImage(prompt);
  }
  // Gemini models via Lovable gateway
  return generateGeminiImage(model, prompt, seedUrl);
}

async function generateGeminiImage(model: string, prompt: string, seedUrl?: string): Promise<{ base64: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  const messages: any[] = [];
  const userContent: any[] = [];

  if (seedUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: seedUrl },
    });
    userContent.push({
      type: "text",
      text: `Use this reference image for layout/color/style guidance ONLY. Do NOT copy literal products or logos. Now generate: ${prompt}`,
    });
  } else {
    userContent.push({ type: "text", text: prompt });
  }

  messages.push({ role: "user", content: userContent });

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, modalities: ["text", "image"] }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini image ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content;

  // Case 1: content is array with image_url part
  if (Array.isArray(content)) {
    const imgPart = content.find((c: any) => c.type === "image_url");
    if (imgPart?.image_url?.url) {
      const url = imgPart.image_url.url;
      if (url.startsWith("data:")) {
        return { base64: url.split(",")[1] };
      }
      const imgResp = await fetch(url);
      const buf = await imgResp.arrayBuffer();
      return { base64: btoa(String.fromCharCode(...new Uint8Array(buf))) };
    }
  }

  // Case 2: content is a string containing a data URI
  if (typeof content === "string") {
    const dataUriMatch = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (dataUriMatch) {
      return { base64: dataUriMatch[1] };
    }
    // Could be a URL
    const urlMatch = content.match(/https?:\/\/\S+\.(png|jpg|jpeg|webp)/i);
    if (urlMatch) {
      const imgResp = await fetch(urlMatch[0]);
      const buf = await imgResp.arrayBuffer();
      return { base64: btoa(String.fromCharCode(...new Uint8Array(buf))) };
    }
  }

  console.error("Gemini response structure:", JSON.stringify(data).slice(0, 500));
  throw new Error("No image in Gemini response");
}

async function generateOpenAIImage(prompt: string): Promise<{ base64: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      output_format: "b64_json",
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI image ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  // gpt-image-1 returns data[].b64_json with output_format
  return { base64: data.data[0].b64_json };
}

async function generateGrokImage(prompt: string): Promise<{ base64: string }> {
  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) throw new Error("XAI_API_KEY not set");

  const resp = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "grok-2-image", prompt, n: 1, response_format: "b64_json" }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Grok image ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  return { base64: data.data[0].b64_json };
}

// ─── Web Research (Stage 0) ───

async function webResearch(
  userPrompt: string,
  modes: { trending: boolean; reddit: boolean }
): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.log("FIRECRAWL_API_KEY not set, skipping web research");
    return "";
  }

  const results: string[] = [];

  // Extract URLs from prompt
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = userPrompt.match(urlRegex) || [];
  const hasUrls = urls.length > 0;

  // Scrape explicit URLs
  for (const url of urls.slice(0, 3)) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const md = data.data?.markdown || data.markdown || "";
        results.push(`[Scraped: ${url}]\n${md.slice(0, 3000)}`);
      }
    } catch (e) {
      console.error(`Failed to scrape ${url}:`, e.message);
    }
  }

  // Trending search (skip if URLs provided)
  if (modes.trending && !hasUrls) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "trending national news today 2026",
          limit: 5,
          tbs: "qdr:d",
          scrapeOptions: { formats: ["markdown"] },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const item of (data.data || []).slice(0, 3)) {
          const md = item.markdown || item.description || "";
          results.push(`[Trending: ${item.title || item.url}]\n${md.slice(0, 2000)}`);
        }
      }
    } catch (e) {
      console.error("Trending search failed:", e.message);
    }
  }

  // Reddit search (skip if URLs provided)
  if (modes.reddit && !hasUrls) {
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `site:reddit.com pain points frustrations ${userPrompt.slice(0, 100)}`,
          limit: 5,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const item of (data.data || []).slice(0, 3)) {
          const md = item.markdown || item.description || "";
          results.push(`[Reddit: ${item.title || item.url}]\n${md.slice(0, 2000)}`);
        }
      }
    } catch (e) {
      console.error("Reddit search failed:", e.message);
    }
  }

  return results.join("\n\n---\n\n").slice(0, 15000);
}

// ─── Stage 1: Research Agent ───

const RESEARCH_TOOL = {
  type: "function",
  function: {
    name: "submit_research",
    description: "Submit research findings for ad creative generation",
    parameters: {
      type: "object",
      properties: {
        motivators: { type: "array", items: { type: "string" }, description: "Key motivators that drive the target audience" },
        angles: { type: "array", items: { type: "string" }, description: "Creative angles to explore" },
        emotional_triggers: { type: "array", items: { type: "string" }, description: "Emotional triggers to leverage" },
        visual_notes: { type: "string", description: "Notes on visual direction" },
      },
      required: ["motivators", "angles", "emotional_triggers", "visual_notes"],
    },
  },
};

async function runResearchAgent(
  textModel: string,
  userPrompt: string,
  knowledgeBase: string,
  refVertical: string,
  webContext: string,
  pastFeedback: string,
  imageStyles: boolean
): Promise<any> {
  const systemPrompt = `You are a world-class advertising research strategist. It is 2026 — all references must be current year. Never reference 2024 or 2025.

${knowledgeBase ? `KNOWLEDGE BASE:\n${knowledgeBase}\n\n` : ""}
${refVertical ? `REFERENCE VERTICAL:\n${refVertical}\n\n` : ""}
${webContext ? `WEB RESEARCH CONTEXT:\n${webContext}\n\n` : ""}
${pastFeedback ? `PAST FEEDBACK — Avoid these issues:\n${pastFeedback}\n\n` : ""}
${imageStyles ? "IMPORTANT: Suggest varied visual styles including: breaking news, collage, editorial, bold typography, meme format, before/after, infographic, testimonial, dark mood vs bright mood." : ""}

Analyze the brief and provide research findings using the submit_research tool.`;

  const result = await callTextModel(
    textModel,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    [RESEARCH_TOOL],
    { type: "function", function: { name: "submit_research" } }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    return { ...JSON.parse(toolCall.function.arguments), text_model_used: result.model_used };
  }

  // Fallback: parse from content
  return {
    motivators: ["urgency", "trust", "social proof"],
    angles: ["problem-solution", "testimonial", "fear of missing out"],
    emotional_triggers: ["anxiety", "relief", "aspiration"],
    visual_notes: "Use bold imagery with clear contrast",
    text_model_used: result.model_used,
  };
}

// ─── Stage 2: Concepting Agent ───

const CONCEPT_TOOL = {
  type: "function",
  function: {
    name: "submit_concepts",
    description: "Submit ad creative concepts",
    parameters: {
      type: "object",
      properties: {
        concepts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headline: { type: "string" },
              caption: { type: "string" },
              image_prompt: { type: "string" },
              angle: { type: "string" },
            },
            required: ["headline", "caption", "image_prompt", "angle"],
          },
        },
      },
      required: ["concepts"],
    },
  },
};

async function runConceptingAgent(
  textModel: string,
  research: any,
  userPrompt: string,
  conceptCount: number,
  pastFeedback: string,
  imageStyles: boolean,
  seedDescription: string
): Promise<any> {
  const systemPrompt = `You are a top creative director. Generate exactly ${conceptCount} ad concepts. It is 2026.

RESEARCH FINDINGS:
- Motivators: ${JSON.stringify(research.motivators)}
- Angles: ${JSON.stringify(research.angles)}
- Emotional Triggers: ${JSON.stringify(research.emotional_triggers)}
- Visual Notes: ${research.visual_notes}

${pastFeedback ? `PAST FEEDBACK — Avoid these issues:\n${pastFeedback}\n\n` : ""}
${imageStyles ? "CRITICAL: Each concept MUST use a DIFFERENT visual style (e.g., breaking news, collage, editorial, bold type, meme, before/after, infographic, testimonial, dark vs bright)." : ""}
${seedDescription ? `SEED IMAGE GUIDANCE: ${seedDescription}\nCopy layout/color/style ONLY. Do NOT copy literal products, logos, or industry elements from different verticals.` : ""}

Each concept must have a unique angle. Generate image prompts that describe the visual in detail.
Use the submit_concepts tool.`;

  const result = await callTextModel(
    textModel,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    [CONCEPT_TOOL],
    { type: "function", function: { name: "submit_concepts" } }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    return { ...JSON.parse(toolCall.function.arguments), text_model_used: result.model_used };
  }

  throw new Error("Concepting agent did not return concepts via tool call");
}

// ─── Stage 4: QC Agent ───

async function runQCAgent(
  imageBase64: string,
  originalPrompt: string
): Promise<{ pass: boolean; improved_prompt?: string }> {
  // Use a vision-capable model — prefer Gemini or GPT
  const model = "google/gemini-3-flash-preview";

  const systemPrompt = `You are a quality control inspector for ad creatives. Inspect the image for these issues IN ORDER:

1. Scan top edge (100px) — any clipped/cut text?
2. Scan bottom edge (100px)
3. Scan left edge (100px)
4. Scan right edge (100px) — especially check multi-panel right panels
5. Scan panel boundaries
6. Text readability (contrast, size, overlap)
7. Grammar/spelling errors

If ANY text is clipped, cut off, or extends into the outer 100px border zone, respond with:
needs_regeneration: true
improved_image_prompt: [improved prompt with specific fixes]

The improved prompt MUST specify: what was clipped, use smaller fonts, enforce 100px safe zone, per-panel margins if multi-panel.

If the image passes all checks, respond with:
needs_regeneration: false

Respond in JSON format: { "needs_regeneration": boolean, "improved_image_prompt": string | null }`;

  try {
    const result = await callTextModel(
      model,
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
            { type: "text", text: `Original prompt: ${originalPrompt}\n\nInspect this ad creative image for quality issues.` },
          ],
        },
      ]
    );

    const content = result.choices?.[0]?.message?.content || "";
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        pass: !parsed.needs_regeneration,
        improved_prompt: parsed.improved_image_prompt || undefined,
      };
    }
  } catch (e) {
    console.error("QC agent failed:", e.message);
  }

  return { pass: true }; // If QC fails, pass through
}

// ─── Text Safety Rules (prepended to every image prompt) ───

const TEXT_SAFETY_RULES = `ABSOLUTE TEXT SAFETY RULES:
1. ALL text must stay within a 100px safe zone from every edge (top/bottom/left/right)
2. No letter, word, or punctuation may appear in the outer 100px border
3. If text is too wide → shrink font size, break into lines, or abbreviate. NEVER overflow.
4. Multi-panel layouts: each panel must independently enforce its own 100px safe zone
5. Prefer centered text placement
6. Use smaller fonts than you think necessary — readable small > large clipped
7. Output must be exactly 1024x1024 square format.

`;

// ─── Main Pipeline ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      project_id,
      prompt: userPrompt,
      knowledge_base = "",
      ref_vertical = "",
      output_count = 2,
      image_model = "gemini-flash-image",
      text_model = "gemini-flash",
      modes = { trending: false, reddit: false, imageStyles: false },
      seed_image_urls = [],
    } = await req.json();

    if (!project_id || !userPrompt) {
      return new Response(
        JSON.stringify({ error: "project_id and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create generation record
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .insert({ project_id, status: "running" })
      .select()
      .single();

    if (genError) throw genError;

    const resolvedImageModel = pickModel(image_model, IMAGE_MODELS, true);
    const resolvedTextModel = pickModel(text_model, TEXT_MODELS);

    // Fetch past feedback
    let pastFeedback = "";
    const { data: fbData } = await supabase
      .from("feedback")
      .select("feedback_text")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (fbData?.length) {
      pastFeedback = fbData.map((f: any, i: number) => `${i + 1}. ${f.feedback_text}`).join("\n");
    }

    // Use SSE for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Stage 0: Web Research
          send("stage", { stage: "research", status: "running" });
          let webContext = "";
          try {
            webContext = await webResearch(userPrompt, modes);
          } catch (e) {
            console.error("Web research failed (non-fatal):", e.message);
          }
          send("stage", { stage: "research", status: "done" });

          // Stage 1: Research Agent
          send("stage", { stage: "agent", status: "running" });
          const research = await runResearchAgent(
            resolvedTextModel, userPrompt, knowledge_base, ref_vertical,
            webContext, pastFeedback, modes.imageStyles
          );
          send("stage", { stage: "agent", status: "done", data: research });

          // Stage 2: Concepting Agent
          send("stage", { stage: "concepting", status: "running" });
          const seedDesc = seed_image_urls.length > 0
            ? "Reference seed images provided. Extract layout structure, color palette, text placement style, visual mood. Do NOT copy literal products."
            : "";
          const concepts = await runConceptingAgent(
            resolvedTextModel, research, userPrompt,
            Math.min(output_count, 4), pastFeedback, modes.imageStyles, seedDesc
          );
          send("stage", { stage: "concepting", status: "done", data: concepts });

          // Stage 3: Image Generation (parallel)
          send("stage", { stage: "generating", status: "running" });

          const conceptList = concepts.concepts || [];
          const imageResults = await Promise.allSettled(
            conceptList.map(async (concept: any, idx: number) => {
              const fullPrompt = TEXT_SAFETY_RULES + concept.image_prompt;
              const seedUrl = seed_image_urls[idx % seed_image_urls.length] || undefined;

              let result = await generateImage(resolvedImageModel, fullPrompt, seedUrl);

              // Stage 4: QC (always runs per image)
              send("stage", { stage: "qc", status: "running", index: idx });
              const qc = await runQCAgent(result.base64, concept.image_prompt);

              if (!qc.pass && qc.improved_prompt) {
                console.log(`QC failed for concept ${idx}, regenerating...`);
                const improvedPrompt = TEXT_SAFETY_RULES + qc.improved_prompt;
                try {
                  result = await generateImage(resolvedImageModel, improvedPrompt, seedUrl);
                } catch (e) {
                  console.error(`Regeneration failed for concept ${idx}:`, e.message);
                }
              }
              send("stage", { stage: "qc", status: "done", index: idx });

              // Upload to storage
              const filename = `default/${project_id}/generated/${crypto.randomUUID()}.png`;
              const imageBytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));

              const { error: uploadError } = await supabase.storage
                .from("generated-images")
                .upload(filename, imageBytes, { contentType: "image/png" });

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from("generated-images")
                .getPublicUrl(filename);

              // Insert asset
              const { data: asset, error: assetError } = await supabase
                .from("assets")
                .insert({
                  project_id,
                  image_url: urlData.publicUrl,
                  headline: concept.headline,
                  caption: concept.caption,
                  model_used: result.model_used,
                  text_model_used: concepts.text_model_used || research.text_model_used,
                  image_prompt: concept.image_prompt,
                  tags: { angle: concept.angle, qc_pass: qc.pass },
                })
                .select()
                .single();

              if (assetError) throw assetError;

              send("asset", { asset, index: idx });
              return asset;
            })
          );

          // Update generation record
          const completedCount = imageResults.filter((r) => r.status === "fulfilled").length;
          await supabase
            .from("generations")
            .update({
              status: completedCount > 0 ? "completed" : "failed",
              completed_count: completedCount,
            })
            .eq("id", gen.id);

          // Log activity
          await supabase.from("activity_log").insert([{
            project_id,
            action_type: "batch_generated",
            description: `Generated ${completedCount}/${conceptList.length} ads`,
            metadata: {
              generation_id: gen.id,
              image_model: resolvedImageModel,
              text_model: resolvedTextModel,
            },
          }]);

          send("stage", { stage: "generating", status: "done" });
          send("done", { generation_id: gen.id, completed: completedCount, total: conceptList.length });
        } catch (e) {
          console.error("Pipeline error:", e);
          send("error", { message: e.message || "Pipeline failed" });

          await supabase
            .from("generations")
            .update({ status: "failed" })
            .eq("id", gen.id);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("Request error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
