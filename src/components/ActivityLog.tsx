import { motion } from "framer-motion";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format } from "date-fns";
import {
  Sparkles, Upload, MessageSquare, Star, Pencil, Trash2, RotateCcw, Activity,
} from "lucide-react";

const ICON_MAP: Record<string, typeof Activity> = {
  batch_generated: Sparkles,
  inspiration_uploaded: Upload,
  feedback_submitted: MessageSquare,
  asset_rated: Star,
  project_renamed: Pencil,
  project_deleted: Trash2,
  project_restored: RotateCcw,
  project_created: Sparkles,
};

interface ActivityLogProps {
  projectId: string;
}

export function ActivityLog({ projectId }: ActivityLogProps) {
  const { data, isLoading } = useActivityLog(projectId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div>;
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">No activity yet.</div>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-1">
        {entries.map((entry, i) => {
          const Icon = ICON_MAP[entry.action_type] ?? Activity;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative flex items-start gap-3 py-2 pl-0"
            >
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card border border-border">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm">{entry.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
