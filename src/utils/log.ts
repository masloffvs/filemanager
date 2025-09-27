export function log(worker: string, service: string, message: string, fields: Record<string, string|number|boolean> = {}) {
  const ts = new Date().toISOString();
  const kv = Object.entries(fields).map(([k,v])=>`${k}=${String(v)}`).join(' ');
  const extra = kv ? ' ' + kv : '';
  console.log(`[${ts}] (${worker}) [${service}] ${message}${extra}`);
}

