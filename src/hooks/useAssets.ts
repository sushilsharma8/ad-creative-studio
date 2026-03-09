import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { submitFeedback } from "@/lib/generateAds";
import type { Tables } from "@/integrations/supabase/types";

type Asset = Tables<"assets">;

export function useAssets(projectId: string | null) {
  const queryClient = useQueryClient();

  const assets = useQuery({
    queryKey: ["assets", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const winners = useQuery({
    queryKey: ["assets", projectId, "winners"],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("project_id", projectId!)
        .eq("is_winner", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rateAsset = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: string }) => {
      const isWinner = rating === "winner";
      const { error } = await supabase
        .from("assets")
        .update({ tags: { rating }, is_winner: isWinner })
        .eq("id", id);
      if (error) throw error;

      if (projectId) {
        await supabase.from("activity_log").insert({
          project_id: projectId,
          action_type: "asset_rated",
          description: `Asset rated as ${rating}`,
          metadata: { asset_id: id, rating },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
    },
  });

  return { assets, winners, rateAsset };
}

export function useFeedback(projectId: string | null, assetId: string | null) {
  const queryClient = useQueryClient();

  const feedback = useQuery({
    queryKey: ["feedback", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("asset_id", assetId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addFeedback = useMutation({
    mutationFn: async (text: string) => {
      if (!projectId || !assetId) throw new Error("Missing project or asset");
      await submitFeedback(projectId, assetId, text.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", assetId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ["project_feedback", projectId] });
      toast({ title: "Feedback saved" });
    },
  });

  return { feedback, addFeedback };
}

/** All feedback for a project (for Feedback tab) */
export function useProjectFeedback(projectId: string | null) {
  return useQuery({
    queryKey: ["project_feedback", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("id, feedback_text, analyzed_instructions, created_at, asset_id")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (feedbackError) throw feedbackError;
      if (!feedbackData?.length) return [];
      const assetIds = [...new Set(feedbackData.map((f) => f.asset_id))];
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("id, headline, image_url")
        .in("id", assetIds);
      if (assetsError) throw assetsError;
      const assetMap = new Map((assetsData ?? []).map((a) => [a.id, a]));
      return feedbackData.map((f) => ({
        ...f,
        asset: assetMap.get(f.asset_id) ?? null,
      }));
    },
  });
}

/** Delete a feedback entry (for Feedback tab management) */
export function useDeleteFeedback(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_feedback", projectId] });
      toast({ title: "Feedback deleted" });
    },
  });
}
