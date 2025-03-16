"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/button";
import { cn, Server } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import Sidebar from "@/components/airlink/Sidebar";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import { Card, CardContent } from "@/components/shadcn/card";
import { Plus, RefreshCcw, Search } from "lucide-react";
import { Input } from "@/components/shadcn/input";

const Servers: React.FC = () => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [servers, setServers] = useState<Server[]>([
    { name: "Server1", uuid: "123e4567", ram: "8GB", cpu: "400%", disk: "50GB", memoryUsage: "8/16GB", cpuUsage: "50%", diskUsage: "25/50GB", status: 'Online' },
    { name: "Server2", uuid: "223e4567", ram: "6GB", cpu: "800%", disk: "100GB", memoryUsage: "16/32GB", cpuUsage: "70%", diskUsage: "50/100GB", status: 'Starting' },
    { name: "Server3", uuid: "323e4567", ram: "12GB", cpu: "1600%", disk: "200GB", memoryUsage: "32/64GB", cpuUsage: "90%", diskUsage: "100/200GB", status: 'Stopped' }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, []);

  const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
        <div className="p-6 sm:p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">Servers</h1>
            <p className="text-muted-foreground">View and manage your Servers.</p>
          </div>

          {servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-96 text-center">
              <div className="mb-4">
                <div className="spinner">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">There are no Servers</h2>
              <p className="text-muted-foreground mb-4">You don&apos;t have any servers yet. Why not create one now?</p>
              <Button>Create a server</Button>
            </div>
          ) : (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="flex justify-between items-center p-4 border-b">
                  <div className="relative w-full sm:w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search servers..."
                      className="w-full pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => router.push("/admin/servers/create")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead className="text-white">
                    <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">UUID</th>
                        <th className="p-3 text-left">RAM</th>
                        <th className="p-3 text-left">CPU</th>
                        <th className="p-3 text-left">Disk</th>
                        <th className="p-3 text-left">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredServers.map((server, index) => (
                        <tr key={index} className="border-t">
                        <td className="p-3">{server.name}</td>
                        <td className="p-3">{server.uuid}</td>
                        <td className="p-3">{server.ram}</td>
                        <td className="p-3">{server.cpu}</td>
                        <td className="p-3">{server.disk}</td>
                        <td className="p-3">{server.status}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Servers;
