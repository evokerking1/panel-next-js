"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import Sidebar from "@/components/airlink/Sidebar";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import { Card, CardContent } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";

const NodeCreate: React.FC = () => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    name: "",
    ram: "",
    disk: "",
    cpu: "",
    ipAddress: "",
    daemonPort: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/nodes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Node created successfully!");
        setFormData({ name: "", ram: "", disk: "", cpu: "", ipAddress: "", daemonPort: "" });
      } else {
        alert("Failed to create node");
      }
    } catch (error) {
      console.error("Error creating node:", error);
      alert("Error creating node");
    }
  };

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
        <div className="p-6 sm:p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">Create Node</h1>
            <p className="text-muted-foreground">Create your Node.</p>
          </div>
          <Card className="mt-4">
            <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="name" placeholder="Node Name" value={formData.name} onChange={handleChange} required />
                <Input name="ram" type="number" placeholder="RAM (GB)" value={formData.ram} onChange={handleChange} required />
                <Input name="disk" type="number" placeholder="Disk (GB)" value={formData.disk} onChange={handleChange} required />
                <Input name="cpu" type="number" placeholder="CPU Cores" value={formData.cpu} onChange={handleChange} required />
                <Input name="ipAddress" placeholder="IP Address (localhost or 192.168.1.1)" value={formData.ipAddress} onChange={handleChange} required />
                <Input name="daemonPort" type="number" placeholder="Daemon Port (e.g. 3002)" value={formData.daemonPort} onChange={handleChange} required />
                </div>
                <Button type="submit" className="mt-5">Create Node</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NodeCreate;
