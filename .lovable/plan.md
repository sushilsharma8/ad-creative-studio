

## AI Ad Creative Platform — Phase 1: Full UI + Database

### Overview
Build the complete frontend UI and Supabase database schema for an AI-powered ad creative generation platform. Dark theme throughout, Facebook ad preview format. Backend edge function will be wired up in Phase 2.

### Database Setup (Lovable Cloud)
- **projects** table: id, user_id, name, deleted_at (nullable for soft delete), created_at
- **generations** table: id, project_id, user_id, status, completed_count, created_at
- **assets** table: id, project_id, user_id, image_url, asset_type, is_winner, headline, caption, model_used, text_model_used, tags (jsonb), image_prompt (text), created_at
- **feedback** table: id, project_id, asset_id, feedback_text, created_at
- **inspiration_assets** table: id, project_id, user_id, image_url, created_at
- **activity_log** table: id, project_id, action_type, description, metadata (jsonb), created_at
- Storage buckets for generated images and inspiration uploads

### App Layout
- **Sidebar** with project list, inline rename (pencil icon → input), soft delete, and Trash section at bottom with restore/permanent delete
- **Main content area** with tabs: Creative Lab, Asset Library, Activity Log, Inspiration

### Creative Lab Page
- **Generation Settings Panel**: prompt textarea, knowledge base textarea, reference vertical textarea, output count (1–4), image model selector (Gemini Flash Image, Gemini 3 Pro Image, GPT Image, Grok Image, Randomize), text model selector (Gemini Flash, GPT-5, Claude, Randomize), research mode toggles (Trending, Reddit, Image Styles)
- **Seed Images Section**: shows project winners with deselect toggle (greyed + X overlay when deselected), "Re-select all" link, explanatory label
- **Generation Progress UI**: staged progress indicators (Web Research → Research → Concepting → Image Gen → QC) — wired to mock states for now

### Asset Library Page
- **Ad Cards** in a responsive grid, square aspect ratio with Facebook feed chrome (avatar, name, "Sponsored", like/comment/share bar)
- **Hover overlay**: ℹ️ detail button, rating buttons (Winner ⭐ / Good 👍 / Okay 😐 / Poor 👎)
- **Detail Dialog**: headline, caption, angle, models used, full image prompt in scrollable monospace, QC result, feedback thread
- **Feedback input** per asset, saved to feedback table
- **Toolbar**: Select All, Export CSV, download images
- Dark-theme-safe button styling (outline, bg-secondary/50)

### Activity Log Page
- Chronological timeline showing: generations, uploads, feedback, ratings, project actions

### Inspiration Tab
- Upload images to Supabase storage + inspiration_assets table
- Display uploaded images in a grid
- Toast notifications on success/failure

### Data Flow (Mock for Phase 1)
- All CRUD operations (projects, assets, feedback, activity log) will be fully wired to Supabase
- Generation itself will use placeholder/mock data until the edge function is connected in Phase 2

### Phase 2 (Future)
- Supabase Edge Function with the full 5-stage AI pipeline
- API key setup (OpenAI, Anthropic, xAI, Firecrawl)
- Live generation with incremental saves and real-time progress

