const ADMIN_TOKEN_KEY = 'hns_admin_token';
const MEMBER_TOKEN_KEY = 'hns_member_token';

let memoryAdminToken: string | null = null;
let memoryMemberToken: string | null = null;

function safeGetStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string | null): void {
  try {
    if (!value) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage access restrictions in embedded iframes
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAdminToken(): string | null {
  return memoryAdminToken || safeGetStorage(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  memoryAdminToken = token;
  safeSetStorage(ADMIN_TOKEN_KEY, token);
}

export function getMemberToken(): string | null {
  return memoryMemberToken || safeGetStorage(MEMBER_TOKEN_KEY);
}

export function setMemberToken(token: string | null): void {
  memoryMemberToken = token;
  safeSetStorage(MEMBER_TOKEN_KEY, token);
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const reqHeaders = new Headers(headers || {});
  if (!reqHeaders.has('Content-Type') && rest.body) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (token) {
    reqHeaders.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { ...rest, headers: reqHeaders });
  let data: { error?: string } = {};
  try {
    const text = await res.text();
    if (text) {
      data = JSON.parse(text) as { error?: string };
    }
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
