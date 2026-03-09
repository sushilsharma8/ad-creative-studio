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

const COLOR_MAP: Record<string, string> = {
  batch_generated: "bg-primary/10 text-primary",
  inspiration_uploaded: "bg-success/10 text-success",
  feedback_submitted: "bg-warning/10 text-warning",
  asset_rated: "bg-warning/10 text-warning",
  project_renamed: "bg-secondary text-secondary-foreground",
  project_deleted: "bg-destructive/10 text-destructive",
  project_restored: "bg-success/10 text-success",
  project_created: "bg-primary/10 text-primary",
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
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-2xl">
      {/* Timeline line */}
      <div className="absolute left-5 top-6 bottom-6 w-[2px] bg-border rounded-full" />

      <div className="space-y-1">
        {entries.map((entry, i) => {
          const Icon = ICON_MAP[entry.action_type] ?? Activity;
          const colorClass = COLOR_MAP[entry.action_type] ?? "bg-muted text-muted-foreground";
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative flex items-start gap-4 py-3 pl-0"
            >
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-medium">{entry.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
