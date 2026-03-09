import { motion } from "framer-motion";
import { MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { useProjectFeedback, useDeleteFeedback } from "@/hooks/useAssets";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface FeedbackTabProps {
  projectId: string;
  onViewAsset: (assetId: string) => void;
}

export function FeedbackTab({ projectId, onViewAsset }: FeedbackTabProps) {
  const { data: feedbackList, isLoading } = useProjectFeedback(projectId);
  const deleteFeedback = useDeleteFeedback(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading feedback…
      </div>
    );
  }

  const entries = feedbackList ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          No feedback yet. Use “What’s wrong?” on any creative in Assets to add feedback and improve future generations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {entries.length} feedback {entries.length === 1 ? "entry" : "entries"} — used to improve the next ad generations.
      </p>
      <div className="space-y-3">
        {entries.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "rounded-xl border border-border bg-card overflow-hidden",
              "flex flex-col sm:flex-row sm:items-start gap-4 p-4"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground whitespace-pre-wrap">{f.feedback_text}</p>
              {"analyzed_instructions" in f && (f as { analyzed_instructions?: string | null }).analyzed_instructions && (
                <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Applied in next generation</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{(f as { analyzed_instructions: string }).analyzed_instructions}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                {format(new Date(f.created_at), "MMM d, yyyy · h:mm a")}
                {f.asset?.headline && (
                  <span className="ml-1.5">
                    · Creative: “{f.asset.headline.length > 50 ? f.asset.headline.slice(0, 50) + "…" : f.asset.headline}”
                  </span>
                )}
              </p>
              {f.asset && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1.5"
                    onClick={() => onViewAsset(f.asset_id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View creative
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {f.asset?.image_url && (
                <button
                  type="button"
                  onClick={() => onViewAsset(f.asset_id)}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0 hover:opacity-90 transition-opacity"
                >
                  <img src={f.asset.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete feedback"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This feedback will no longer be used when generating new ads. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteFeedback.mutate(f.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
