/**
 * HEXNS Mediaworks - Shared TypeScript Definitions
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}
