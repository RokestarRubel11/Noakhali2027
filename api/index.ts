import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../src/server/app.ts';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const forwardedPath = parsed.searchParams.get('__path');
  if (forwardedPath !== null) {
    parsed.searchParams.delete('__path');
    const cleanSubPath = forwardedPath.replace(/^\/+/, '');
    const qs = parsed.searchParams.toString();
    req.url = `/api/${cleanSubPath}${qs ? `?${qs}` : ''}`;
  }
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
