import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useProjects() {
  const queryClient = useQueryClient();

  const activeProjects = useQuery({
    queryKey: ["projects", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const trashedProjects = useQuery({
    queryKey: ["projects", "trashed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      logActivity(data.id, "project_created", `Project "${data.name}" created`);
    },
  });

  const renameProject = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("projects").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      logActivity(vars.id, "project_renamed", `Project renamed to "${vars.name}"`);
    },
  });

  const softDeleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      logActivity(id, "project_deleted", "Project moved to trash");
      toast({ title: "Project moved to trash" });
    },
  });

  const restoreProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      logActivity(id, "project_restored", "Project restored from trash");
      toast({ title: "Project restored" });
    },
  });

  const permanentDeleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project permanently deleted" });
    },
  });

  return {
    activeProjects,
    trashedProjects,
    createProject,
    renameProject,
    softDeleteProject,
    restoreProject,
    permanentDeleteProject,
  };
}

async function logActivity(projectId: string, actionType: string, description: string, metadata: Record<string, unknown> = {}) {
  await supabase.from("activity_log").insert({
    project_id: projectId,
    action_type: actionType,
    description,
    metadata,
  });
}
