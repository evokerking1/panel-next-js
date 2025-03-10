"use client";

import { cn, Server } from "@/lib/utils";
import Header from "@/components/airlink/Header";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/utils/authenticated";
import Sidebar from "@/components/airlink/Sidebar";
import ServerSidebar from "@/components/airlink/ServerSidebar";
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent} from "@/components/shadcn/card"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/shadcn/breadcrumb"
import { MoveRightIcon } from "lucide-react";
import { useServerData } from "@/hooks/use-server-data"
import { formatBytes } from "@/lib/utils"
import {
    FolderOpen,
    File,
    FileText,
    FileCode,
    FileJson,
    FileImage,
    FileArchive,
    Upload,
    Download,
    Trash2,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react"


type FileType = "folder" | "file" | "text" | "code" | "json" | "image" | "archive"

type FileItem = {
    name: string
    type: FileType
    size: number
    modified: string
    path: string
}

const FileExplorer: React.FC = () => {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [servers, setServers] = useState<Server[]>([
        { name: "Server1", uuid: "123e4567", ram: "8GB", cpu: "400%", disk: "50GB", memoryUsage: "8/16GB", cpuUsage: "50%", diskUsage: "25/50GB", status: 'Online' },
        { name: "Server2", uuid: "223e4567", ram: "6GB", cpu: "800%", disk: "100GB", memoryUsage: "16/32GB", cpuUsage: "70%", diskUsage: "50/100GB", status: 'Starting' },
        { name: "Server3", uuid: "323e4567", ram: "12GB", cpu: "1600%", disk: "200GB", memoryUsage: "32/64GB", cpuUsage: "90%", diskUsage: "100/200GB", status: 'Stopped' }
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setServers(prevServers => prevServers.map(server => {
                if (server.status !== 'Stopped') {
                    return {
                        ...server,
                        memoryUsage: `${Math.floor(Math.random() * parseInt(server.ram))}/${server.ram}`,
                        cpuUsage: `${(Math.random() * 100).toFixed(1)}%`,
                        diskUsage: `${Math.floor(Math.random() * parseInt(server.disk))}/${server.disk}`
                    };
                }
                return {
                    ...server,
                    memoryUsage: `0/${server.ram}`,
                    cpuUsage: `0%`,
                    diskUsage: `0/${server.disk}`
                };
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/auth/login");
        }
    }, []);
    const params = useParams<{ id: string }>()
    const { server, isLoading } = useServerData(params.id)
    const [currentPath, setCurrentPath] = useState("/")
    const [searchQuery, setSearchQuery] = useState("")

    // Mock file data
    const mockFiles: FileItem[] = [
        { name: "server.properties", type: "text", size: 1024, modified: "2023-05-15", path: "/" },
        { name: "server.jar", type: "file", size: 35840000, modified: "2023-05-10", path: "/" },
        { name: "plugins", type: "folder", size: 0, modified: "2023-05-12", path: "/" },
        { name: "world", type: "folder", size: 0, modified: "2023-05-14", path: "/" },
        { name: "logs", type: "folder", size: 0, modified: "2023-05-14", path: "/" },
        { name: "config.json", type: "json", size: 2048, modified: "2023-05-13", path: "/" },
        { name: "server-icon.png", type: "image", size: 4096, modified: "2023-05-11", path: "/" }
    ]

    const filteredFiles = mockFiles
    .filter(
        (file) => file.path === currentPath && file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });

    const getFileIcon = (type: FileType) => {
        switch (type) {
            case "folder":
                return <FolderOpen className="h-5 w-5 text-blue-500" />
            case "text":
                return <FileText className="h-5 w-5 text-gray-500" />
            case "code":
                return <FileCode className="h-5 w-5 text-purple-500" />
            case "json":
                return <FileJson className="h-5 w-5 text-yellow-500" />
            case "image":
                return <FileImage className="h-5 w-5 text-green-500" />
            case "archive":
                return <FileArchive className="h-5 w-5 text-red-500" />
            default:
                return <File className="h-5 w-5 text-gray-500" />
        }
    }

    const handleFileClick = (file: FileItem) => {
        if (file.type === "folder") {
            setCurrentPath(`${currentPath}${file.name}/`)
        } else {
            // In a real app, this would open the file editor or viewer
            console.log("Opening file:", file)
        }
    }

    const navigateUp = () => {
        if (currentPath === "/") return

        const pathParts = currentPath.split("/").filter(Boolean)
        pathParts.pop()
        setCurrentPath(pathParts.length ? `/${pathParts.join("/")}/` : "/")
    }

    const pathParts = currentPath.split("/").filter(Boolean)

    // if (isLoading) {
    //     return (
    //         <Card>
    //             <CardHeader>
    //                 <CardTitle className="animate-pulse bg-muted h-6 w-1/3 rounded" />
    //                 <CardDescription className="animate-pulse bg-muted h-4 w-1/2 rounded" />
    //             </CardHeader>
    //             <CardContent className="animate-pulse bg-muted h-[500px] rounded" />
    //         </Card>
    //     )
    // }

    return (
        <div className="min-h-screen dark bg-background text-foreground">
                        <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                        <main className={cn("pt-14 transition-all duration-300 ease-in-out", isSidebarOpen ? "pl-60" : "pl-0")}>
                            <div className="p-6 sm:p-4 md:p-6">
                                <div className="mb-6">
                                    <h1 className="text-2xl font-semibold">File Manager</h1>
                                    <p className="text-muted-foreground">Browse and manage server files.</p>
                                </div>

                                <ServerSidebar/>

                                <Card className="h-full flex flex-col">
                                    {/* <CardHeader className="pb-2">
                                            <CardTitle>File Manager</CardTitle>
                                            <CardDescription>Browse and manage server files</CardDescription>
                                        </CardHeader> */}
                                    <CardContent className="flex-1 p-0">
                                        <div className="flex flex-col h-full">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border-y bg-muted/50">
                                                <Breadcrumb>
                                                    <BreadcrumbList>
                                                        <BreadcrumbItem>
                                                            <BreadcrumbSeparator><MoveRightIcon/></BreadcrumbSeparator>
                                                            <BreadcrumbLink onClick={() => setCurrentPath("/")} className="cursor-pointer">
                                                                home
                                                            </BreadcrumbLink>
                                                            <BreadcrumbSeparator><MoveRightIcon/></BreadcrumbSeparator>
                                                            <BreadcrumbLink onClick={() => setCurrentPath("/")} className="cursor-pointer">
                                                                container
                                                            </BreadcrumbLink>
                                                        </BreadcrumbItem>
                                                        {pathParts.map((part, index) => (
                                                            <BreadcrumbItem key={part}>
                                                                <BreadcrumbSeparator><MoveRightIcon/></BreadcrumbSeparator>
                                                                <BreadcrumbLink
                                                                    onClick={() => setCurrentPath(`/${pathParts.slice(0, index + 1).join("/")}/`)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    {part}
                                                                </BreadcrumbLink>
                                                            </BreadcrumbItem>
                                                        ))}
                                                    </BreadcrumbList>
                                                </Breadcrumb>
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <div className="relative w-full sm:w-[200px]">
                                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="search"
                                                            placeholder="Search files..."
                                                            className="w-full pl-8"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button variant="outline" size="icon">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="icon">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="file-browser flex-1 overflow-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="text-left p-3 font-medium">Name</th>
                                                            <th className="text-left p-3 font-medium hidden md:table-cell">Size</th>
                                                            <th className="text-left p-3 font-medium hidden md:table-cell">Modified</th>
                                                            <th className="text-right p-3 font-medium">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentPath !== "/" && (
                                                            <tr className="border-b hover:bg-muted/50 cursor-pointer" onClick={navigateUp}>
                                                                <td className="p-3 flex items-center">
                                                                    <FolderOpen className="h-5 w-5 text-blue-500 mr-2" />
                                                                    <span>..</span>
                                                                </td>
                                                                <td className="p-3 hidden md:table-cell">-</td>
                                                                <td className="p-3 hidden md:table-cell">-</td>
                                                                <td className="p-3 text-right">-</td>
                                                            </tr>
                                                        )}
                                                        {filteredFiles.map((file) => (
                                                            <tr
                                                                key={file.name}
                                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                                onClick={() => handleFileClick(file)}
                                                            >
                                                                <td className="p-3 flex items-center">
                                                                    {getFileIcon(file.type)}
                                                                    <span className="ml-2">{file.name}</span>
                                                                </td>
                                                                <td className="p-3 hidden md:table-cell">
                                                                    {file.type === "folder" ? "-" : formatBytes(file.size)}
                                                                </td>
                                                                <td className="p-3 hidden md:table-cell">{file.modified}</td>
                                                                <td className="p-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {file.type !== "folder" && (
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                                <Download className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {filteredFiles.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                                    No files found in this directory
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </main>
        </div>
    );
};

export default FileExplorer;
