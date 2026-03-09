import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/AppSidebar";
import { CreativeLab } from "@/components/CreativeLab";
import { AssetLibrary } from "@/components/AssetLibrary";
import { ActivityLog } from "@/components/ActivityLog";
import { InspirationTab } from "@/components/InspirationTab";
import { Sparkles, Image, Activity, Upload, Zap } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full dark">
        <AppSidebar selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-5 shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-sm font-bold truncate tracking-tight">
              {selectedProjectId ? "Creative Lab" : "Welcome"}
            </h1>
          </header>

          <main className="flex-1 overflow-y-auto">
            {!selectedProjectId ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 p-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-float"
                >
                  <Zap className="h-10 w-10 text-primary-foreground" />
                </motion.div>
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <h2 className="text-2xl font-extrabold tracking-tight">Ad Creative AI</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                    Generate stunning AI-powered ad creatives in seconds. Select a project or create one to get started.
                  </p>
                </motion.div>
              </div>
            ) : (
              <div className="p-4 md:p-6">
                <Tabs defaultValue="lab" className="space-y-5">
                  <TabsList className="bg-card border border-border rounded-2xl p-1 h-auto gap-1">
                    <TabsTrigger value="lab" className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all">
                      <Sparkles className="h-3.5 w-3.5" /> Lab
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all">
                      <Image className="h-3.5 w-3.5" /> Assets
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all">
                      <Activity className="h-3.5 w-3.5" /> Activity
                    </TabsTrigger>
                    <TabsTrigger value="inspiration" className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all">
                      <Upload className="h-3.5 w-3.5" /> Inspo
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
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
