export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ServerPort {
  primary: boolean;
  Port: number;
}

export interface ServerVariable {
  name: string;
  description?: string;
  env_variable?: string;
  env?: string;
  type: 'boolean' | 'text' | 'number';
  default_value?: string | number | boolean;
  default?: string | number | boolean;
  value?: string | number | boolean;
  user_viewable?: boolean;
  user_editable?: boolean;
  rules?: string;
}

export interface ImageInfo {
  features?: string[];
  [key: string]: unknown;
}

export type ServerStatus = 'running' | 'stopped' | 'installing' | 'unknown';
