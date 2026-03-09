import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, ImagePlus } from "lucide-react";
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
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-full text-xs h-8 px-4 border-border">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Images
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Upload reference images for inspiration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {data.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-card hover:shadow-card-hover transition-all"
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <button
                onClick={() => deleteInspiration.mutate(img.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground"
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
