
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- Create generations table
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to generations" ON public.generations FOR ALL USING (true) WITH CHECK (true);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'default',
  image_url TEXT,
  asset_type TEXT NOT NULL DEFAULT 'generated',
  is_winner BOOLEAN NOT NULL DEFAULT false,
  headline TEXT,
  caption TEXT,
  model_used TEXT,
  text_model_used TEXT,
  tags JSONB DEFAULT '{}',
  image_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);

-- Create inspiration_assets table
CREATE TABLE public.inspiration_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'default',
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inspiration_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inspiration_assets" ON public.inspiration_assets FOR ALL USING (true) WITH CHECK (true);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to activity_log" ON public.activity_log FOR ALL USING (true) WITH CHECK (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('inspiration-images', 'inspiration-images', true);

-- Storage policies
CREATE POLICY "Public read generated images" ON storage.objects FOR SELECT USING (bucket_id = 'generated-images');
CREATE POLICY "Allow upload generated images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-images');
CREATE POLICY "Allow delete generated images" ON storage.objects FOR DELETE USING (bucket_id = 'generated-images');

CREATE POLICY "Public read inspiration images" ON storage.objects FOR SELECT USING (bucket_id = 'inspiration-images');
CREATE POLICY "Allow upload inspiration images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspiration-images');
CREATE POLICY "Allow delete inspiration images" ON storage.objects FOR DELETE USING (bucket_id = 'inspiration-images');
