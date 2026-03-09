import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
      const { error } = await supabase.from("feedback").insert({
        project_id: projectId,
        asset_id: assetId,
        feedback_text: text,
      });
      if (error) throw error;

      await supabase.from("activity_log").insert({
        project_id: projectId,
        action_type: "feedback_submitted",
        description: `Feedback: "${text.slice(0, 50)}..."`,
        metadata: { asset_id: assetId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", assetId] });
      toast({ title: "Feedback saved" });
    },
  });

  return { feedback, addFeedback };
}
