"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { cn } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import Sidebar from "@/components/airlink/Sidebar";
import ServerSidebar from "@/components/airlink/ServerSidebar";
import { Globe, Image, Server, Hash, Tag, Activity, MemoryStick, Cpu, HardDrive, Power, RotateCcw, OctagonX } from "lucide-react";
import { Button } from "@/components/shadcn/button";

const Overview: React.FC = () => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const serverUUID = useParams().id;


  const [status, setStatus] = useState<string>("Online");
  const [ramUsage, setRamUsage] = useState<number>(75);
  const [cpuUsage, setCpuUsage] = useState<number>(50);
  const [diskUsage, setDiskUsage] = useState<number>(60);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, []);

  const cards = [
    { 
      title: "IP Address:", 
      content: <span>localhost<span className="text-neutral-400">:25565</span></span>, 
      icon: <Globe className="w-6 h-6 text-neutral-400" /> 
    },
    { title: "Image:", content: "Minecraft Java: Paper", icon: <Tag className="w-6 h-6 text-neutral-400" /> },
    { title: "Node:", content: "Node-01-de", icon: <Server className="w-6 h-6 text-neutral-400" /> },
    { title: "Identifier:", content: serverUUID, icon: <Hash className="w-6 h-6 text-neutral-400" /> },
  ];

  const statusCards = [
    { 
      title: "Status:", 
      content: <span className={`text-lg font-bold tracking-tight ${status === "Online" ? "text-green-500" : "text-red-500"}`}>{status}</span>, 
      icon: <Activity className="w-6 h-6 text-neutral-400" /> 
    },
    { 
      title: "RAM Usage:", 
      content: <span>{ramUsage}% ({(ramUsage / 100) * 4}GB / 4GB)</span>, 
      icon: <MemoryStick className="w-6 h-6 text-neutral-400" /> 
    },
    { 
      title: "CPU Usage:", 
      content: <span>{cpuUsage}% / 100%</span>, 
      icon: <Cpu className="w-6 h-6 text-neutral-400" /> 
    },
    { 
      title: "Disk Usage:", 
      content: <span>{diskUsage}% ({(diskUsage / 100) * 10}GB / 10GB)</span>, 
      icon: <HardDrive className="w-6 h-6 text-neutral-400" /> 
    }
  ];

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
        <div className="p-6 sm:p-4 md:p-6">
        <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-muted-foreground">Summary of your server is shown here.</p>
        </div>
        <div className="flex space-x-4">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white"><Power/>Start</Button>
          <Button className="bg-neutral-600 hover:bg-neutral-600/80 text-white"><RotateCcw/>Restart</Button>
          <Button className="bg-red-600 hover:bg-red-500 text-white"><OctagonX/>Stop</Button>
        </div>
      </div>

          <ServerSidebar />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {cards.map((card, index) => (
              <Card key={index} className="flex flex-row items-center justify-between bg-neutral-500/5 border-neutral-300/5">
                <div>
                  <CardHeader className="truncate text-sm font-medium text-neutral-400">{card.title}</CardHeader>
                  <CardContent className="-mt-5 text-lg font-bold tracking-tight">{card.content}</CardContent>
                </div>
                <div className="flex items-center justify-center w-10 h-10 mr-5 bg-neutral-700/40 border border-neutral-300/5 rounded-lg">{card.icon}</div>
              </Card>
            ))}
          </div>

            <div className="lg:flex lg:gap-6">

            <div className="w-full lg:w-2/3 ">
            <div className="flex mt-6 gap-4 min-h-[400px]">
              <div className="bg-neutral-500/5 border border-neutral-300/5 shadow rounded-t-xl p-4 flex-1">
                <p className="text-[15px]"><span className="text-yellow-500">airlink@container ~ </span>Server marked as offline...</p>
              </div>
            </div>
            <input 
              id="input" 
              type="text" 
              autoComplete="off" 
              placeholder="Type a command..."
              className="w-full px-4 py-3 bg-neutral-600/20 text-white rounded-b-xl text-sm border border-neutral-300/5 focus:ring-1 focus:ring-neutral-100/20 focus:border-transparent placeholder:font-medium placeholder:text-neutral-500"
            />
          </div>

            <div className="grid grid-cols-1 w-full lg:w-1/3 sm:grid-cols-2 lg:grid-cols-1 gap-4 mt-4">
            {statusCards.map((card, index) => (
              <Card key={index} className="flex flex-row items-center justify-between bg-neutral-500/5 border-neutral-300/5">
                <div>
                  <CardHeader className="truncate text-sm font-medium text-neutral-400">{card.title}</CardHeader>
                  <CardContent className="-mt-5 text-lg font-bold tracking-tight">{card.content}</CardContent>
                </div>
                <div className="flex items-center justify-center w-10 h-10 mr-5 bg-neutral-700/40 border border-neutral-300/5 rounded-lg">{card.icon}</div>
              </Card>
            ))}
          </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default Overview;