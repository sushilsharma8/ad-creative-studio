import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, MessageSquare, Palette, X, Check, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAssets } from "@/hooks/useAssets";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { generateAds, type StageStatus } from "@/lib/generateAds";
import { cn } from "@/lib/utils";

const IMAGE_MODELS = [
  { value: "gemini-flash-image", label: "Gemini Flash Image" },
  { value: "gemini-3-pro-image", label: "Gemini 3 Pro Image" },
  { value: "gpt-image-1", label: "GPT Image" },
  { value: "grok-2-image", label: "Grok Image" },
  { value: "randomize", label: "🎲 Randomize" },
];

const TEXT_MODELS = [
  { value: "gemini-flash", label: "Gemini Flash" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "claude-sonnet", label: "Claude" },
  { value: "randomize", label: "🎲 Randomize" },
];

const PIPELINE_STAGES = [
  { key: "research", label: "Web Research", icon: TrendingUp },
  { key: "agent", label: "Research Agent", icon: MessageSquare },
  { key: "concepting", label: "Concepting", icon: Sparkles },
  { key: "generating", label: "Generating Images", icon: Palette },
  { key: "qc", label: "Quality Check", icon: Check },
];

interface CreativeLabProps {
  projectId: string;
}

export function CreativeLab({ projectId }: CreativeLabProps) {
  const { winners } = useAssets(projectId);
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [refVertical, setRefVertical] = useState("");
  const [outputCount, setOutputCount] = useState([2]);
  const [imageModel, setImageModel] = useState("gemini-flash-image");
  const [textModel, setTextModel] = useState("gemini-flash");
  const [modeTrending, setModeTrending] = useState(false);
  const [modeReddit, setModeReddit] = useState(false);
  const [modeImageStyles, setModeImageStyles] = useState(false);
  const [deselectedSeeds, setDeselectedSeeds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Record<string, StageStatus>>({});
  const [generatedCount, setGeneratedCount] = useState(0);

  const winnerAssets = winners.data ?? [];

  const toggleSeed = (id: string) => {
    setDeselectedSeeds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setStageStatuses({});
    setGeneratedCount(0);

    const selectedSeeds = winnerAssets
      .filter((a) => !deselectedSeeds.has(a.id) && a.image_url)
      .map((a) => a.image_url!);

    try {
      await generateAds(
        {
          project_id: projectId,
          prompt: prompt.trim(),
          knowledge_base: knowledgeBase,
          ref_vertical: refVertical,
          output_count: outputCount[0],
          image_model: imageModel,
          text_model: textModel,
          modes: { trending: modeTrending, reddit: modeReddit, imageStyles: modeImageStyles },
          seed_image_urls: selectedSeeds,
        },
        {
          onStage: (update) => {
            setStageStatuses((prev) => ({ ...prev, [update.stage]: update.status }));
          },
          onAsset: () => {
            setGeneratedCount((c) => c + 1);
            queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
          },
          onDone: (data) => {
            setIsGenerating(false);
            queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
            queryClient.invalidateQueries({ queryKey: ["activity_log", projectId] });
            toast({ title: "Generation complete ✨", description: `${data.completed}/${data.total} ads generated.` });
          },
          onError: (message) => {
            setIsGenerating(false);
            toast({ title: "Generation failed", description: message, variant: "destructive" });
          },
        }
      );
    } catch (e) {
      setIsGenerating(false);
      toast({ title: "Generation failed", description: String(e), variant: "destructive" });
    }
  }, [prompt, knowledgeBase, refVertical, outputCount, imageModel, textModel, modeTrending, modeReddit, modeImageStyles, projectId, winnerAssets, deselectedSeeds, queryClient]);

  const getStageStatus = (key: string): StageStatus => stageStatuses[key] || "pending";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Settings */}
        <div className="space-y-5">
          <Card className="border-border rounded-2xl shadow-card overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">Creative Brief</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the ad you want to generate..."
                  className="min-h-[100px] bg-muted/50 border-0 rounded-xl resize-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">Knowledge Base</Label>
                  <Textarea
                    value={knowledgeBase}
                    onChange={(e) => setKnowledgeBase(e.target.value)}
                    placeholder="Vertical-specific guidance..."
                    className="min-h-[72px] bg-muted/50 border-0 rounded-xl resize-none text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">Reference Vertical</Label>
                  <Textarea
                    value={refVertical}
                    onChange={(e) => setRefVertical(e.target.value)}
                    placeholder="Competitor references..."
                    className="min-h-[72px] bg-muted/50 border-0 rounded-xl resize-none text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border rounded-2xl shadow-card overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">Image Model</Label>
                  <Select value={imageModel} onValueChange={setImageModel}>
                    <SelectTrigger className="bg-muted/50 border-0 rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {IMAGE_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">Text Model</Label>
                  <Select value={textModel} onValueChange={setTextModel}>
                    <SelectTrigger className="bg-muted/50 border-0 rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TEXT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                    Outputs: <span className="text-primary font-bold">{outputCount[0]}</span>
                  </Label>
                  <Slider value={outputCount} onValueChange={setOutputCount} min={1} max={4} step={1} className="mt-4" />
                </div>
              </div>

              {/* Research Modes */}
              <div className="flex flex-wrap gap-3">
                {[
                  { checked: modeTrending, onChange: setModeTrending, icon: TrendingUp, label: "Trending" },
                  { checked: modeReddit, onChange: setModeReddit, icon: MessageSquare, label: "Reddit" },
                  { checked: modeImageStyles, onChange: setModeImageStyles, icon: Palette, label: "Style Diversity" },
                ].map((mode) => (
                  <label
                    key={mode.label}
                    className={cn(
                      "flex items-center gap-2 text-xs px-3.5 py-2 rounded-full border cursor-pointer transition-all select-none",
                      mode.checked
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Switch checked={mode.checked} onCheckedChange={mode.onChange} className="scale-75" />
                    <mode.icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full sm:w-auto rounded-full px-8 h-12 text-sm font-bold shadow-float hover:shadow-card-hover transition-all"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating...{generatedCount > 0 && ` (${generatedCount}/${outputCount[0]})`}</>
            ) : (
              <><Wand2 className="h-4 w-4" />Generate Ads</>
            )}
          </Button>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Seed Images */}
          <Card className="border-border rounded-2xl shadow-card overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-bold">Seed Images</CardTitle>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Winners auto-selected — tap to deselect.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {winnerAssets.length === 0 ? (
                <div className="rounded-xl bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No winners yet. Rate assets ⭐ to use as seeds.</p>
                </div>
              ) : (
                <>
                  {deselectedSeeds.size > 0 && (
                    <button onClick={() => setDeselectedSeeds(new Set())} className="text-xs text-primary hover:underline mb-2 font-semibold">
                      Re-select all
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {winnerAssets.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => toggleSeed(a.id)}
                        className={cn(
                          "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                          deselectedSeeds.has(a.id) ? "opacity-40 border-muted grayscale" : "border-primary shadow-sm"
                        )}
                      >
                        <img src={a.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        {deselectedSeeds.has(a.id) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                            <X className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Progress */}
          {isGenerating && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border rounded-2xl shadow-card overflow-hidden">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-bold">Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-1.5">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const Icon = stage.icon;
                    const status = getStageStatus(stage.key);
                    return (
                      <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={cn(
                          "flex items-center gap-2.5 text-sm rounded-xl px-3 py-2 transition-all",
                          status === "done" && "text-success bg-success/8",
                          status === "running" && "text-primary bg-primary/8 font-semibold",
                          status === "pending" && "text-muted-foreground"
                        )}
                      >
                        {status === "done" ? <Check className="h-4 w-4" /> : status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                        <span className="text-xs">{stage.label}</span>
                        {stage.key === "generating" && status === "running" && generatedCount > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-auto">{generatedCount}/{outputCount[0]}</span>
                        )}
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
