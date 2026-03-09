import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspirationAssets } from "@/hooks/useInspirationAssets";

interface InspirationTabProps {
  projectId: string;
}

export function InspirationTab({ projectId }: InspirationTabProps) {
  const { inspirations, uploadInspiration, deleteInspiration } = useInspirationAssets(projectId);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadInspiration.mutate(f));
  };

  const data = inspirations.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="bg-secondary/50 text-foreground">
          <Upload className="h-4 w-4 mr-1" /> Upload Images
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          No inspiration images yet. Upload some reference images!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {data.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <button
                onClick={() => deleteInspiration.mutate(img.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
