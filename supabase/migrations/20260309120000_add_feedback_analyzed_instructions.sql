-- Add analyzed_instructions to feedback: AI-derived actionable lines for next generation
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS analyzed_instructions TEXT;

COMMENT ON COLUMN public.feedback.analyzed_instructions IS 'AI-analyzed actionable instructions from feedback_text + creative context, used in next ad generation';
