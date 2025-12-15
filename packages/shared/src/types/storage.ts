export interface StoredFile {
  id: string;
  tenantId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
}

export interface UploadInput {
  file: File;
  folder?: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600
}
