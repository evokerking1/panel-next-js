"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import Sidebar from "@/components/airlink/Sidebar";
import ServerSidebar from "@/components/airlink/ServerSidebar";
import { Power, RotateCcw, OctagonX, RefreshCcw, Plus, Search, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";

const BackupPage: React.FC = () => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const serverUUID = useParams().id;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const backups = [
    { name: "Test Backup", size: "1 GB", created: "2 minutes ago", success: false },
    { name: "Backup 2", size: "2 GB", created: "10 minutes ago", success: true },
    { name: "Backup 3", size: "3 GB", created: "30 minutes ago", success: true },
  ];

  const filteredBackups = backups.filter((backup) =>
    backup.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
        <div className="p-6 sm:p-4 md:p-6">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold">Backups</h1>
              <p className="text-muted-foreground">Manage and restore your server backups.</p>
            </div>
            <div className="flex space-x-4">
              {/** Here we can put Buttons for the Pages */}
            </div>
          </div>

          <ServerSidebar />

          <Card className="mt-4">
            <CardContent className="p-0">
              <div className="flex justify-between items-center p-4 border-b">
                <div>
                  {/** Here we can put other components if needed */}
                </div>
                <div className="flex space-x-2">
                  <div className="relative w-full sm:w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search backups..."
                      className="w-full pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-white">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Size</th>
                      <th className="p-3 text-left">Created</th>
                      <th className="p-3 text-left">Successful</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBackups.map((backup, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{backup.name}</td>
                        <td className="p-3">{backup.size}</td>
                        <td className="p-3">{backup.created}</td>
                        <td className="p-3 flex ml-5 items-center">
                          {backup.success ? (
                            <CircleCheck className="text-green-500" />
                          ) : (
                            <CircleX className="text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BackupPage;