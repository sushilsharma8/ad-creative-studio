import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, FolderOpen, ChevronDown, Zap } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}

export function AppSidebar({ selectedProjectId, onSelectProject }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const {
    activeProjects, trashedProjects,
    createProject, renameProject, softDeleteProject,
    restoreProject, permanentDeleteProject,
  } = useProjects();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);

  const handleCreate = () => {
    createProject.mutate("Untitled Project", {
      onSuccess: (p) => onSelectProject(p.id),
    });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameProject.mutate({ id: editingId, name: editName.trim() });
    }
    setEditingId(null);
  };

  const trashed = trashedProjects.data ?? [];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-float">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-foreground text-sm tracking-tight">AdCreative</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">AI-Powered Ads</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Projects</SidebarGroupLabel>
            {!collapsed && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {(activeProjects.data ?? []).map((p) => (
                <SidebarMenuItem key={p.id}>
                  {editingId === p.id ? (
                    <div className="px-2 py-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={commitRename}
                        autoFocus
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => onSelectProject(p.id)}
                      className={cn(
                        "group justify-between rounded-xl h-10 transition-all",
                        selectedProjectId === p.id
                          ? "bg-primary/10 text-primary font-semibold shadow-sm"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <FolderOpen className={cn("h-4 w-4 shrink-0", selectedProjectId === p.id ? "text-primary" : "text-muted-foreground")} />
                        {!collapsed && <span className="truncate text-sm">{p.name}</span>}
                      </span>
                      {!collapsed && (
                        <span className="hidden gap-1 group-hover:flex">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRename(p.id, p.name); }}
                            className="p-1 rounded-lg hover:bg-secondary transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); softDeleteProject.mutate(p.id); }}
                            className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}

              {(activeProjects.data ?? []).length === 0 && !collapsed && (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No projects yet</p>
                  <Button size="sm" onClick={handleCreate} className="rounded-full px-4 text-xs h-8">
                    <Plus className="h-3 w-3 mr-1" /> New Project
                  </Button>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && trashed.length > 0 && (
        <SidebarFooter className="p-3">
          <Collapsible open={trashOpen} onOpenChange={setTrashOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground text-xs rounded-xl h-8">
                <span className="flex items-center gap-1.5"><Trash2 className="h-3 w-3" />Trash ({trashed.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", trashOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-1">
                {trashed.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground rounded-lg hover:bg-muted transition-colors">
                    <span className="truncate">{p.name}</span>
                    <span className="flex gap-1">
                      <button onClick={() => restoreProject.mutate(p.id)} className="p-1 hover:text-foreground rounded transition-colors" title="Restore">
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button onClick={() => permanentDeleteProject.mutate(p.id)} className="p-1 hover:text-destructive rounded transition-colors" title="Delete permanently">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
