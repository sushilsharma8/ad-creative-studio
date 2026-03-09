import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useInspirationAssets(projectId: string | null) {
  const queryClient = useQueryClient();

  const inspirations = useQuery({
    queryKey: ["inspiration_assets", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspiration_assets")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadInspiration = useMutation({
    mutationFn: async (file: File) => {
      if (!projectId) throw new Error("No project selected");
      const ext = file.name.split(".").pop();
      const path = `default/${projectId}/inspiration/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("inspiration-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inspiration-images")
        .getPublicUrl(path);

      const { error: insertError } = await supabase.from("inspiration_assets").insert({
        project_id: projectId,
        image_url: urlData.publicUrl,
      });
      if (insertError) throw insertError;

      await supabase.from("activity_log").insert({
        project_id: projectId,
        action_type: "inspiration_uploaded",
        description: `Inspiration image uploaded`,
        metadata: { file_name: file.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspiration_assets", projectId] });
      toast({ title: "Inspiration image uploaded" });
    },
    onError: (err: Error) => {
      console.error("Upload failed:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteInspiration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inspiration_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspiration_assets", projectId] });
    },
  });

  return { inspirations, uploadInspiration, deleteInspiration };
}
