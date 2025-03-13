import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export interface Server {
  name: string;
  uuid: string;
  ram: string;
  cpu: string;
  disk: string;
  memoryUsage: string;
  cpuUsage: string;
  diskUsage: string;
  status: 'Online' | 'Starting' | 'Stopped';
}

export interface Node {
  name: string;
  uuid: string;
  ram: string;
  cpu: string;
  disk: string;
  address: string;
  port: string;
  key: string;
  status: 'Online' | 'Starting' | 'Stopped' | 'Unkown';
  version: string;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export function formatPercentage(used: number, total: number) {
  return Math.round((used / total) * 100)
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
