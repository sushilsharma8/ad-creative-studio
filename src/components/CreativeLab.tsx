import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, MessageSquare, Palette, X, Check, Loader2 } from "lucide-react";
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
          onAsset: (update) => {
            setGeneratedCount((c) => c + 1);
            queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
          },
          onDone: (data) => {
            setIsGenerating(false);
            queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
            queryClient.invalidateQueries({ queryKey: ["activity_log", projectId] });
            toast({
              title: "Generation complete",
              description: `${data.completed}/${data.total} ads generated successfully.`,
            });
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

  const getStageStatus = (key: string): "pending" | "running" | "done" => {
    return stageStatuses[key] || "pending";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Settings */}
        <div className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Creative Brief</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the ad you want to generate..."
              className="min-h-[120px] bg-card border-border"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Knowledge Base</Label>
              <Textarea
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                placeholder="Vertical-specific guidance, brand rules..."
                className="min-h-[80px] bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Reference Vertical</Label>
              <Textarea
                value={refVertical}
                onChange={(e) => setRefVertical(e.target.value)}
                placeholder="Competitor references, inspiration text..."
                className="min-h-[80px] bg-card border-border"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Image Model</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Text Model</Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Outputs: {outputCount[0]}
              </Label>
              <Slider value={outputCount} onValueChange={setOutputCount} min={1} max={4} step={1} className="mt-3" />
            </div>
          </div>

          {/* Research Modes */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={modeTrending} onCheckedChange={setModeTrending} />
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Trending Articles
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={modeReddit} onCheckedChange={setModeReddit} />
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Reddit Pain Points
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={modeImageStyles} onCheckedChange={setModeImageStyles} />
              <Palette className="h-4 w-4 text-muted-foreground" /> Image Style Diversity
            </label>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating...{generatedCount > 0 && ` (${generatedCount}/${outputCount[0]})`}</>
            ) : (
              <><Sparkles className="h-4 w-4" />Generate Ads</>
            )}
          </Button>
        </div>

        {/* Right Panel: Seeds & Progress */}
        <div className="space-y-4">
          {/* Seed Images */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Seed Images</CardTitle>
              <p className="text-xs text-muted-foreground">
                All winners auto-selected as seeds — click to deselect.
              </p>
            </CardHeader>
            <CardContent>
              {winnerAssets.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No winners yet. Rate assets as ⭐ Winner to use as seeds.</p>
              ) : (
                <>
                  {deselectedSeeds.size > 0 && (
                    <button
                      onClick={() => setDeselectedSeeds(new Set())}
                      className="text-xs text-primary hover:underline mb-2"
                    >
                      Re-select all
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {winnerAssets.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => toggleSeed(a.id)}
                        className={cn(
                          "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                          deselectedSeeds.has(a.id) ? "opacity-40 border-muted grayscale" : "border-primary"
                        )}
                      >
                        <img src={a.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        {deselectedSeeds.has(a.id) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
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
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pipeline Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PIPELINE_STAGES.map((stage, i) => {
                  const Icon = stage.icon;
                  const status = getStageStatus(stage.key);
                  return (
                    <motion.div
                      key={stage.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        "flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition-colors",
                        status === "done" && "text-success",
                        status === "running" && "text-primary bg-primary/10",
                        status === "pending" && "text-muted-foreground"
                      )}
                    >
                      {status === "done" ? <Check className="h-4 w-4" /> : status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      {stage.label}
                      {stage.key === "generating" && status === "running" && generatedCount > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">{generatedCount}/{outputCount[0]}</span>
                      )}
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
