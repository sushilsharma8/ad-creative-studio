import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, FolderOpen, ChevronDown } from "lucide-react";
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">AD</span>
          </div>
          {!collapsed && <span className="font-semibold text-foreground">Ad Creative AI</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            {!collapsed && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreate}>
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
                        className="h-7 text-sm"
                      />
                    </div>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => onSelectProject(p.id)}
                      className={cn(
                        "group justify-between",
                        selectedProjectId === p.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{p.name}</span>}
                      </span>
                      {!collapsed && (
                        <span className="hidden gap-1 group-hover:flex">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRename(p.id, p.name); }}
                            className="p-0.5 rounded hover:bg-muted"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); softDeleteProject.mutate(p.id); }}
                            className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && trashed.length > 0 && (
        <SidebarFooter className="p-2">
          <Collapsible open={trashOpen} onOpenChange={setTrashOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground text-xs">
                <span className="flex items-center gap-1.5"><Trash2 className="h-3 w-3" />Trash ({trashed.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", trashOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-1">
                {trashed.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground rounded hover:bg-muted">
                    <span className="truncate">{p.name}</span>
                    <span className="flex gap-1">
                      <button onClick={() => restoreProject.mutate(p.id)} className="p-0.5 hover:text-foreground" title="Restore">
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button onClick={() => permanentDeleteProject.mutate(p.id)} className="p-0.5 hover:text-destructive" title="Delete permanently">
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
