"use client";

import { useEffect, FC } from "react";
import {
  Monitor,
  Users,
  Folder,
  Earth,
  DatabaseBackup,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname, useParams } from "next/navigation";

const ServerSidebar: FC = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const user = useAuth((state: any) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const serverUUID = useParams().id;

  const isActive = (path: string) => pathname.startsWith(path);

  const features = ["players", "worlds"];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const navItems = [
    { path: `/server/${serverUUID}/`, label: "Console", icon: Monitor },
    { path: `/server/${serverUUID}/files`, label: "Files", icon: Folder },
    { path: `/server/${serverUUID}/backups`, label: "Backups", icon: CloudDownload },
    { path: `/server/${serverUUID}/players`, label: "Players", icon: Users, feature: "players" },
    { path: `/server/${serverUUID}/worlds`, label: "Worlds", icon: Earth, feature: "worlds" },
  ];

  return (
    <div className="mt-6 mb-8">
      <div>
        <div className="hidden relative sm:block">
          <nav className="flex relative">
          <ul role="list" className="flex min-w-full mt-1.5 flex-none gap-x-2 text-sm font-normal leading-6 text-neutral-400">
            {navItems
              .filter(({ feature }) => !feature || features.includes(feature))
              .map(({ path, label, icon: Icon }) => (
                <li key={path} className="transition">
                  <Button
                    onClick={() => handleNavigation(path)}
                    variant={isActive(path) ? "secondary" : "ghost"}
                    className="nav-link2 py-2 px-3 transition border hover:bg-white/5 border-transparent hover:text-white hover:shadow rounded-xl"
                  >
                    <Icon className="size-5 mb-0.5 inline-flex mr-1" />
                    {label}
                  </Button>
                </li>
              ))}
          </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ServerSidebar;