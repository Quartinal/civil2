import type { ScramjetController } from "@mercuryworkshop/scramjet";
import type { UVConfig } from "@titaniumnetwork-dev/ultraviolet";

interface IProxyObjMap {
  name: string;
  getValue: () => UVConfig | ScramjetController | undefined;
}

export default [
  {
    name: "uv",
    getValue: () => self?.__uv$config,
  },
  {
    name: "scramjet",
    getValue: () =>
      typeof window !== "undefined" ? window.scramjet : undefined,
  },
] as IProxyObjMap[];
