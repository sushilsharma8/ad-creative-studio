import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { useFeedback } from "@/hooks/useAssets";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

interface AssetDetailDialogProps {
  asset: Tables<"assets">;
  projectId: string;
  onClose: () => void;
  /** When true, scrolls to and focuses the feedback section (e.g. when opened via "What's wrong?" on card) */
  focusFeedback?: boolean;
}

export function AssetDetailDialog({ asset, projectId, onClose, focusFeedback = false }: AssetDetailDialogProps) {
  const { feedback, addFeedback } = useFeedback(projectId, asset.id);
  const [feedbackText, setFeedbackText] = useState("");
  const feedbackSectionRef = useRef<HTMLDivElement>(null);
  const feedbackInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusFeedback && feedbackSectionRef.current) {
      feedbackSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => feedbackInputRef.current?.focus(), 300);
    }
  }, [focusFeedback]);

  const handleSubmit = () => {
    if (!feedbackText.trim()) return;
    addFeedback.mutate(feedbackText.trim());
    setFeedbackText("");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="sr-only shrink-0">
          <DialogTitle>{asset.headline || "Ad Creative Detail"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6">
          <div className="space-y-0 pt-6 pb-8">
            {/* Facebook-style preview: header → description → image → headline */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
              <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-[10px] font-extrabold text-primary-foreground">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Your Brand</p>
                  <p className="text-[10px] text-muted-foreground">Sponsored</p>
                </div>
              </div>
              {asset.caption && (
                <p className="px-3 pb-2 text-sm text-foreground leading-snug whitespace-pre-wrap break-words">
                  {asset.caption}
                </p>
              )}
              <div className="aspect-square bg-muted">
                <img src={asset.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
              </div>
              {asset.headline && (
                <div className="px-3 py-2.5 border-t border-border">
                  <p className="text-sm font-semibold text-foreground">{asset.headline}</p>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 pt-5">
              {asset.headline && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Headline</span>
                  <p className="text-sm font-semibold mt-1">{asset.headline}</p>
                </div>
              )}
              {asset.caption && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Caption</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{asset.caption}</p>
                </div>
              )}
              {asset.model_used && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Image Model</span>
                  <p className="text-sm mt-1 font-mono text-xs">{asset.model_used}</p>
                </div>
              )}
              {asset.text_model_used && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Text Model</span>
                  <p className="text-sm mt-1 font-mono text-xs">{asset.text_model_used}</p>
                </div>
              )}
            </div>

            {/* Image Prompt */}
            {asset.image_prompt ? (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Image Prompt</span>
                <pre className="mt-2 rounded-xl bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                  {asset.image_prompt}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-xl p-3">Image prompt not available for older assets.</p>
            )}

            {/* Feedback: what's wrong — used to improve next generation */}
            <div ref={feedbackSectionRef} className="pt-5 mt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Improve next generation</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Describe what’s wrong with this creative (e.g. text too small, wrong tone, bad crop). Your feedback is used when generating new ads so we avoid these issues.
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(feedback.data ?? []).map((f) => (
                  <div key={f.id} className="rounded-xl bg-muted/50 px-4 py-3 border border-border/50">
                    <p className="text-sm text-foreground">{f.feedback_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {format(new Date(f.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea
                  ref={feedbackInputRef}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Text is clipped at the edges, image feels too busy, headline doesn't match the visual..."
                  rows={3}
                  className="w-full text-sm rounded-xl bg-muted/50 border-border resize-none min-h-[72px]"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!feedbackText.trim()}
                    className="rounded-xl gap-1.5"
                    title="Submit feedback"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send feedback
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
