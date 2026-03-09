import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Info, Star, ThumbsUp, Meh, ThumbsDown, CheckSquare, Download, MessageSquare } from "lucide-react";
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
  /** When set (e.g. from Feedback tab "View creative"), open this asset's detail dialog */
  openAssetId?: string | null;
  onClearOpenAssetId?: () => void;
}

export function AssetLibrary({ projectId, openAssetId, onClearOpenAssetId }: AssetLibraryProps) {
  const { assets, rateAsset } = useAssets(projectId);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [focusFeedback, setFocusFeedback] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const data = assets.data ?? [];

  useEffect(() => {
    if (!openAssetId || !data.length || !onClearOpenAssetId) return;
    const asset = data.find((a) => a.id === openAssetId);
    if (asset) {
      setSelectedAsset(asset);
      setFocusFeedback(false);
    }
    onClearOpenAssetId();
  }, [openAssetId, data, onClearOpenAssetId]);

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
                  "group relative overflow-hidden rounded-2xl bg-card border-border shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col",
                  selectedIds.has(asset.id) && "ring-2 ring-primary"
                )}>
                  {/* Facebook-style header: AD + Brand + Sponsored */}
                  <div className="flex items-center gap-2.5 px-3 pt-3 pb-1 shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-[10px] font-extrabold text-primary-foreground shrink-0">
                      AD
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">Your Brand</p>
                      <p className="text-[10px] text-muted-foreground">Sponsored</p>
                    </div>
                    <button
                      onClick={() => toggleSelect(asset.id)}
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center text-[10px] transition-all shrink-0",
                        selectedIds.has(asset.id) ? "bg-primary text-primary-foreground" : "border border-muted-foreground/20 hover:border-primary"
                      )}
                    >
                      {selectedIds.has(asset.id) && "✓"}
                    </button>
                  </div>

                  {/* Primary text / description — above image, truncated like Facebook */}
                  <div className="px-3 pb-2 min-h-[3.5rem] shrink-0">
                    <p className="text-sm text-foreground leading-snug line-clamp-4 break-words overflow-hidden text-ellipsis">
                      {asset.caption || "\u00A0"}
                    </p>
                  </div>

                  {/* Main creative image — zoom on hover, no overlay */}
                  <div className="relative aspect-square bg-muted shrink-0 overflow-hidden">
                    <img
                      src={asset.image_url || "/placeholder.svg"}
                      alt={asset.headline || "Ad creative"}
                      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Winner Badge */}
                    {asset.is_winner && (
                      <div className="absolute top-2.5 right-2.5 bg-warning text-warning-foreground rounded-full p-1.5 shadow-sm">
                        <Star className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {/* Headline — below image, single line with ellipsis */}
                  <div className="px-3 py-2.5 shrink-0 border-t border-border/80">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {asset.headline || "\u00A0"}
                    </p>
                  </div>

                  {/* Actions: Details, What's wrong?, ratings — below headline, not on image */}
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-border/80 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs font-medium gap-1.5" onClick={() => { setSelectedAsset(asset); setFocusFeedback(false); }}>
                      <Info className="h-3.5 w-3.5" /> Details
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs font-medium gap-1.5 text-primary" onClick={() => { setSelectedAsset(asset); setFocusFeedback(true); }} title="What's wrong? Your feedback improves future generations">
                      <MessageSquare className="h-3.5 w-3.5" /> What's wrong?
                    </Button>
                    <div className="flex gap-0.5 ml-auto">
                      {RATINGS.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button
                            key={r.key}
                            onClick={() => rateAsset.mutate({ id: asset.id, rating: r.key })}
                            title={r.label}
                            className={cn(
                              "p-1.5 rounded-md transition-colors hover:bg-muted",
                              rating === r.key ? r.color : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Facebook-style actions */}
                  <div className="flex items-center justify-around py-2 border-t border-border text-muted-foreground shrink-0">
                    <span className="text-xs font-medium hover:text-foreground cursor-pointer transition-colors">Like</span>
                    <span className="text-xs font-medium hover:text-foreground cursor-pointer transition-colors">Comment</span>
                    <span className="text-xs font-medium hover:text-foreground cursor-pointer transition-colors">Share</span>
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
          onClose={() => { setSelectedAsset(null); setFocusFeedback(false); }}
          focusFeedback={focusFeedback}
        />
      )}
    </div>
  );
}
