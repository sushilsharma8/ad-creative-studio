import { useState } from "react";
import { motion } from "framer-motion";
import { Info, Star, ThumbsUp, Meh, ThumbsDown, CheckSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAssets } from "@/hooks/useAssets";
import { AssetDetailDialog } from "@/components/AssetDetailDialog";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Asset = Tables<"assets">;

const RATINGS = [
  { key: "winner", icon: Star, label: "Winner", color: "text-warning" },
  { key: "good", icon: ThumbsUp, label: "Good", color: "text-success" },
  { key: "okay", icon: Meh, label: "Okay", color: "text-muted-foreground" },
  { key: "poor", icon: ThumbsDown, label: "Poor", color: "text-destructive" },
];

interface AssetLibraryProps {
  projectId: string;
}

export function AssetLibrary({ projectId }: AssetLibraryProps) {
  const { assets, rateAsset } = useAssets(projectId);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const data = assets.data ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(data.map((a) => a.id)));
  };

  const exportCSV = () => {
    const rows = data.filter((a) => selectedIds.has(a.id));
    if (rows.length === 0) return;
    const headers = ["url", "headline", "caption", "model", "created_at"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [r.image_url, r.headline, r.caption, r.model_used, r.created_at]
          .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "assets.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const getRating = (asset: Asset) => {
    if (asset.tags && typeof asset.tags === "object" && "rating" in asset.tags) {
      return (asset.tags as { rating: string }).rating;
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={selectAll} className="rounded-full text-xs h-8 px-4 border-border">
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          {selectedIds.size === data.length && data.length > 0 ? "Deselect All" : "Select All"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={selectedIds.size === 0} className="rounded-full text-xs h-8 px-4 border-border">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export ({selectedIds.size})
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <Star className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No assets yet. Generate some ads in the Lab!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((asset, i) => {
            const rating = getRating(asset);
            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card className={cn(
                  "group relative overflow-hidden rounded-2xl bg-card border-border shadow-card hover:shadow-card-hover transition-all duration-300",
                  selectedIds.has(asset.id) && "ring-2 ring-primary"
                )}>
                  {/* Facebook Chrome Header */}
                  <div className="flex items-center gap-2.5 p-3 pb-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-[10px] font-extrabold text-primary-foreground">
                      AD
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">Your Brand</p>
                      <p className="text-[10px] text-muted-foreground">Sponsored · 🌐</p>
                    </div>
                    <button
                      onClick={() => toggleSelect(asset.id)}
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center text-[10px] transition-all",
                        selectedIds.has(asset.id) ? "bg-primary text-primary-foreground" : "border border-muted-foreground/20 hover:border-primary"
                      )}
                    >
                      {selectedIds.has(asset.id) && "✓"}
                    </button>
                  </div>

                  {asset.caption && (
                    <p className="px-3 pb-2 text-xs line-clamp-4 leading-relaxed">{asset.caption}</p>
                  )}

                  {/* Image */}
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={asset.image_url || "/placeholder.svg"}
                      alt={asset.headline || "Ad creative"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-3">
                      <Button size="sm" className="rounded-full px-5 h-9 text-xs font-bold shadow-float" onClick={() => setSelectedAsset(asset)}>
                        <Info className="h-3.5 w-3.5 mr-1.5" /> Details
                      </Button>
                      <div className="flex gap-1 bg-card/80 backdrop-blur rounded-full px-2 py-1">
                        {RATINGS.map((r) => {
                          const Icon = r.icon;
                          return (
                            <button
                              key={r.key}
                              onClick={() => rateAsset.mutate({ id: asset.id, rating: r.key })}
                              title={r.label}
                              className={cn(
                                "p-2 rounded-full transition-all hover:scale-110",
                                rating === r.key ? r.color : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Winner Badge */}
                    {asset.is_winner && (
                      <div className="absolute top-2.5 right-2.5 bg-warning text-warning-foreground rounded-full p-1.5 shadow-sm">
                        <Star className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {asset.headline && (
                    <div className="p-3 pt-2.5">
                      <p className="text-xs font-bold line-clamp-1">{asset.headline}</p>
                    </div>
                  )}

                  {/* FB Actions */}
                  <div className="flex items-center justify-around py-2.5 border-t border-border text-[10px] text-muted-foreground font-medium">
                    <span className="hover:text-foreground cursor-pointer transition-colors">👍 Like</span>
                    <span className="hover:text-foreground cursor-pointer transition-colors">💬 Comment</span>
                    <span className="hover:text-foreground cursor-pointer transition-colors">↗ Share</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedAsset && (
        <AssetDetailDialog
          asset={selectedAsset}
          projectId={projectId}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
