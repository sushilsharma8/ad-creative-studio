// @ts-nocheck — Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEXT_MODELS = [
  "google/gemini-3-flash-preview",
  "openai/gpt-5",
  "anthropic/claude-sonnet",
];

async function analyzeFeedbackWithAI(
  creativeContext: string,
  feedbackText: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = `You are an ad creative quality analyst. Given an ad creative (headline, caption, image description) and the user's feedback about what was wrong, output 1–3 concrete, actionable instructions to apply in the NEXT ad generation.

Rules:
- Output ONLY the instructions, one per line. No preamble or numbering.
- Be specific and actionable (e.g. "Keep all text within 100px safe zone from edges", "Use smaller font sizes for body copy", "Avoid cluttered compositions").
- Each line should be a single instruction that can be directly used in a generation prompt.`;

  const userContent = `AD CREATIVE CONTEXT:\n${creativeContext}\n\nUSER FEEDBACK:\n${feedbackText}\n\nOutput 1–3 actionable instructions for the next generation (one per line):`;

  const model = TEXT_MODELS[0];
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 300,
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway error: ${t}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
  return text || feedbackText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { project_id, asset_id, feedback_text } = await req.json();
    if (!project_id || !asset_id || !feedback_text || typeof feedback_text !== "string") {
      return new Response(
        JSON.stringify({ error: "project_id, asset_id, and feedback_text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("headline, caption, image_prompt")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creativeContext = [
      asset.headline && `Headline: ${asset.headline}`,
      asset.caption && `Caption: ${asset.caption}`,
      asset.image_prompt && `Image description: ${asset.image_prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    let analyzed_instructions: string | null = feedback_text;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey && creativeContext.trim()) {
      try {
        analyzed_instructions = await analyzeFeedbackWithAI(
          creativeContext,
          feedback_text,
          apiKey
        );
      } catch (e) {
        console.error("Feedback analysis failed, storing raw feedback:", e.message);
        analyzed_instructions = null;
      }
    }

    const { data: feedbackRow, error: insertError } = await supabase
      .from("feedback")
      .insert({
        project_id,
        asset_id,
        feedback_text,
        ...(analyzed_instructions != null && { analyzed_instructions }),
      })
      .select("id, feedback_text, analyzed_instructions, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("activity_log").insert({
      project_id,
      action_type: "feedback_submitted",
      description: `Feedback: "${feedback_text.slice(0, 50)}..."`,
      metadata: { asset_id },
    });

    return new Response(JSON.stringify({ feedback: feedbackRow }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
