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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{asset.headline || "Ad Creative Detail"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Image */}
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={asset.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {asset.headline && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Headline</span>
                  <p className="font-medium">{asset.headline}</p>
                </div>
              )}
              {asset.caption && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Caption</span>
                  <p>{asset.caption}</p>
                </div>
              )}
              {asset.model_used && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Image Model</span>
                  <p>{asset.model_used}</p>
                </div>
              )}
              {asset.text_model_used && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Text Model</span>
                  <p>{asset.text_model_used}</p>
                </div>
              )}
            </div>

            {/* Image Prompt */}
            {asset.image_prompt ? (
              <div>
                <span className="text-xs text-muted-foreground uppercase">Image Prompt</span>
                <pre className="mt-1 rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {asset.image_prompt}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Image prompt not available for older assets.</p>
            )}

            {/* Feedback Thread */}
            <div>
              <span className="text-xs text-muted-foreground uppercase">Feedback</span>
              <div className="mt-2 space-y-2">
                {(feedback.data ?? []).map((f) => (
                  <div key={f.id} className="rounded-md bg-muted px-3 py-2 text-sm">
                    <p>{f.feedback_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(f.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <Input
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add feedback..."
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="text-sm bg-card"
                />
                <Button size="icon" onClick={handleSubmit} disabled={!feedbackText.trim()}>
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
