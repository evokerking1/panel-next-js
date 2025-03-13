"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/button";
import { cn, Node } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import Sidebar from "@/components/airlink/Sidebar";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import { Card, CardContent } from "@/components/shadcn/card";
import { Plus, RefreshCcw, Search } from "lucide-react";
import { Input } from "@/components/shadcn/input";

const Nodes: React.FC = () => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nodes, setNodes] = useState<Node[]>([
    {
      name: "Node 1",
      uuid: "123e4567",
      ram: "8",
      cpu: "4",
      disk: "50",
      address: "localhost",
      port: "3002",
      key: "test",
      status: "Online",
      version: "1.0",
    },
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

  const filteredNodes = nodes.filter((node) =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
        <div className="p-6 sm:p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">Nodes</h1>
            <p className="text-muted-foreground">View and manage your Nodes.</p>
          </div>

          {nodes.length === 0 ? (
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
              <h2 className="text-xl font-semibold mb-2">There are no Nodes</h2>
              <p className="text-muted-foreground mb-4">You don&apos;t have any nodes yet. Why not create one now?</p>
              <Button>Create a node</Button>
            </div>
          ) : (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="flex justify-between items-center p-4 border-b">
                  <div className="relative w-full sm:w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search nodes..."
                      className="w-full pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => router.push("/admin/nodes/create")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-white">
                      <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">RAM</th>
                        <th className="p-3 text-left">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNodes.map((node, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{node.name}</td>
                          <td className="p-3">{node.ram}</td>
                          <td className="p-3">{node.address}</td>
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

export default Nodes;
