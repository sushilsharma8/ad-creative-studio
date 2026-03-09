import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/AppSidebar";
import { CreativeLab } from "@/components/CreativeLab";
import { AssetLibrary } from "@/components/AssetLibrary";
import { ActivityLog } from "@/components/ActivityLog";
import { InspirationTab } from "@/components/InspirationTab";
import { Sparkles, Image, Activity, Upload } from "lucide-react";

const Index = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full dark">
        <AppSidebar selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-3" />
            <h1 className="text-sm font-semibold truncate">
              {selectedProjectId ? "Ad Creative Lab" : "Select a project"}
            </h1>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {!selectedProjectId ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Welcome to Ad Creative AI</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select a project from the sidebar or create a new one to start generating AI-powered ad creatives.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="lab" className="space-y-4">
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="lab" className="gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> Creative Lab
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="gap-1.5 text-xs">
                    <Image className="h-3.5 w-3.5" /> Asset Library
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1.5 text-xs">
                    <Activity className="h-3.5 w-3.5" /> Activity Log
                  </TabsTrigger>
                  <TabsTrigger value="inspiration" className="gap-1.5 text-xs">
                    <Upload className="h-3.5 w-3.5" /> Inspiration
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lab">
                  <CreativeLab projectId={selectedProjectId} />
                </TabsContent>
                <TabsContent value="assets">
                  <AssetLibrary projectId={selectedProjectId} />
                </TabsContent>
                <TabsContent value="activity">
                  <ActivityLog projectId={selectedProjectId} />
                </TabsContent>
                <TabsContent value="inspiration">
                  <InspirationTab projectId={selectedProjectId} />
                </TabsContent>
              </Tabs>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
