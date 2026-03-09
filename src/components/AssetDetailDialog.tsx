import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useFeedback } from "@/hooks/useAssets";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

interface AssetDetailDialogProps {
  asset: Tables<"assets">;
  projectId: string;
  onClose: () => void;
}

export function AssetDetailDialog({ asset, projectId, onClose }: AssetDetailDialogProps) {
  const { feedback, addFeedback } = useFeedback(projectId, asset.id);
  const [feedbackText, setFeedbackText] = useState("");

  const handleSubmit = () => {
    if (!feedbackText.trim()) return;
    addFeedback.mutate(feedbackText.trim());
    setFeedbackText("");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold">{asset.headline || "Ad Creative Detail"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5">
            {/* Image */}
            <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-card">
              <img src={asset.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
              {asset.headline && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Headline</span>
                  <p className="text-sm font-semibold mt-1">{asset.headline}</p>
                </div>
              )}
              {asset.caption && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Caption</span>
                  <p className="text-sm mt-1">{asset.caption}</p>
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

            {/* Feedback Thread */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Feedback</span>
              <div className="mt-2 space-y-2">
                {(feedback.data ?? []).map((f) => (
                  <div key={f.id} className="rounded-xl bg-muted/50 px-4 py-3">
                    <p className="text-sm">{f.feedback_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {format(new Date(f.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <Input
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add feedback..."
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="text-sm rounded-xl bg-muted/50 border-0"
                />
                <Button size="icon" onClick={handleSubmit} disabled={!feedbackText.trim()} className="rounded-xl shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
