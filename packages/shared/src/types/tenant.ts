export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface TenantLimits {
  maxUsers: number;
  maxStorage: number; // in bytes
}

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  name?: string;
}

export interface TenantSettings {
  features: string[];
  limits: TenantLimits;
  branding?: TenantBranding;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantInput {
  name?: string;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
}
