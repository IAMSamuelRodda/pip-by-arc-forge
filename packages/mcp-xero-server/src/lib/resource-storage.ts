/**
 * Resource storage for ResourceLink pattern (dual-response)
 *
 * Implements temporary storage for large datasets that can be retrieved
 * out-of-band via REST API, enabling 99% token reduction for reports.
 *
 * Storage Strategy:
 * - Small resources (<1MB): DynamoDB
 * - Large resources (>1MB): S3 + DynamoDB metadata
 * - TTL: 1 hour (automatic cleanup)
 */

import { randomUUID } from 'crypto';

export interface ResourceMetadata {
  resourceId: string;
  type: 'report' | 'list' | 'export';
  tenantId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  sizeBytes: number;
  storageLocation: 'dynamodb' | 's3';
  s3Key?: string;
}

export interface ResourceLink {
  uri: string;
  mimeType: string;
}

export interface DualResponse<T> {
  preview: T;
  resource: ResourceLink;
  metadata: {
    total_rows?: number;
    total_count?: number;
    executed_at: string;
    expires_at: string;
    columns?: string[];
  };
}

/**
 * Generate unique resource ID
 */
export function generateResourceId(): string {
  return randomUUID();
}

/**
 * Create ResourceLink URI
 */
export function createResourceUri(resourceId: string): ResourceLink {
  // In production, this would be the actual REST API endpoint
  // For now, we'll use a placeholder that can be configured via env var
  const baseUrl = process.env.RESOURCE_API_BASE_URL || 'https://api.xero-agent.com';

  return {
    uri: `${baseUrl}/resources/${resourceId}`,
    mimeType: 'application/json'
  };
}

/**
 * Calculate storage location based on size
 */
export function determineStorageLocation(sizeBytes: number): 'dynamodb' | 's3' {
  const DYNAMODB_MAX_SIZE = 400 * 1024; // 400KB (DynamoDB item size limit)
  return sizeBytes < DYNAMODB_MAX_SIZE ? 'dynamodb' : 's3';
}

/**
 * Store resource data (in-memory for now, will use DynamoDB/S3 in production)
 *
 * TODO: Replace with actual DynamoDB/S3 implementation when deploying
 */
const resourceStore = new Map<string, {
  data: any;
  metadata: ResourceMetadata;
}>();

export async function storeResource(
  data: any,
  type: ResourceMetadata['type'],
  tenantId: string,
  userId: string
): Promise<ResourceMetadata> {
  const resourceId = generateResourceId();
  const dataString = JSON.stringify(data);
  const sizeBytes = Buffer.byteLength(dataString, 'utf8');
  const storageLocation = determineStorageLocation(sizeBytes);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600000); // 1 hour

  const metadata: ResourceMetadata = {
    resourceId,
    type,
    tenantId,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sizeBytes,
    storageLocation,
    ...(storageLocation === 's3' && { s3Key: `resources/${resourceId}.json` })
  };

  // In-memory storage for development
  // TODO: Implement actual DynamoDB/S3 storage
  resourceStore.set(resourceId, { data, metadata });

  // Set timeout to clean up expired resources
  setTimeout(() => {
    resourceStore.delete(resourceId);
  }, 3600000);

  console.log(JSON.stringify({
    type: 'resource_stored',
    resourceId,
    storageLocation,
    sizeBytes,
    expiresAt: metadata.expiresAt
  }));

  return metadata;
}

/**
 * Retrieve resource data
 *
 * TODO: Replace with actual DynamoDB/S3 retrieval when deploying
 */
export async function retrieveResource(resourceId: string): Promise<{
  data: any;
  metadata: ResourceMetadata;
} | null> {
  const stored = resourceStore.get(resourceId);

  if (!stored) {
    return null;
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(stored.metadata.expiresAt);

  if (now > expiresAt) {
    resourceStore.delete(resourceId);
    return null;
  }

  return stored;
}

/**
 * Create dual-response with preview + ResourceLink
 *
 * This is the key function for implementing the ResourceLink pattern
 */
export async function createDualResponse<T>(
  fullData: T[],
  previewSize: number,
  type: ResourceMetadata['type'],
  tenantId: string,
  userId: string,
  additionalMetadata?: {
    total_rows?: number;
    columns?: string[];
  }
): Promise<DualResponse<T[]>> {
  // Store full dataset
  const metadata = await storeResource(fullData, type, tenantId, userId);

  // Create ResourceLink
  const resourceLink = createResourceUri(metadata.resourceId);

  // Extract preview (first N items)
  const preview = fullData.slice(0, previewSize);

  return {
    preview,
    resource: resourceLink,
    metadata: {
      total_count: fullData.length,
      executed_at: metadata.createdAt,
      expires_at: metadata.expiresAt,
      ...additionalMetadata
    }
  };
}

/**
 * Production implementation notes:
 *
 * DynamoDB Schema:
 * {
 *   PK: "RESOURCE#<resourceId>",
 *   SK: "METADATA",
 *   resourceId: string,
 *   type: "report" | "list" | "export",
 *   tenantId: string,
 *   userId: string,
 *   data: object (for small resources),
 *   s3Key: string (for large resources),
 *   ttl: number (DynamoDB TTL attribute)
 * }
 *
 * S3 Structure:
 * s3://xero-agent-resources/
 *   resources/<resourceId>.json
 *
 * Lambda Function (Resource Retrieval API):
 * - GET /resources/:resourceId - Returns metadata
 * - GET /resources/:resourceId/data - Returns full data with pagination
 * - POST /resources/:resourceId/query - Apply filters to stored data
 */
