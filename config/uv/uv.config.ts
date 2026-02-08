import type { UVConfig } from "@titaniumnetwork-dev/ultraviolet";
import { encode, decode, setSearchEngine } from "$config/shared/wasmDencode";
import genProxyPath from "$config/shared/genProxyPath";

setSearchEngine(localStorage.getItem("search")! || "google");

const spf = genProxyPath("/", "uv");

const files = ["uv.handler.js", "uv.client.js", "uv.bundle.js", "uv.sw.js"];

const fileProps = Object.fromEntries(
  files.map(file => {
    const propName = file.split(".")[1];
    return [propName, `${spf}${file}`];
  }),
);

const uvConfig: Partial<UVConfig> = {
  prefix: genProxyPath("/~/", "uv"),
  encodeUrl: encode,
  decodeUrl: decode,
  ...fileProps,
  config: "/config/uv_config.js",
};

export default uvConfig;
