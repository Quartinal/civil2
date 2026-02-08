// for internal efficiency
export default function genProxyPath(base?: string, proxy?: "uv" | "scramjet") {
  const cleanBase = base?.endsWith("/") ? base.slice(0, -1) : base;
  return `${cleanBase ?? ""}/${proxy}/`;
}
