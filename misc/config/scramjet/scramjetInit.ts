import genProxyPath from "$config/shared/genProxyPath";
import { setSearchEngine, encode, decode } from "$config/shared/wasmDencode";

setSearchEngine(localStorage.getItem("search")! || "google");

const { ScramjetController } = $scramjetLoadController();

const proxyPath = genProxyPath("/", "scramjet");

const spf = `${proxyPath}scramjet.`;

const config = new ScramjetController({
  prefix: proxyPath,
  files: {
    wasm: `${spf}wasm.wasm`,
    all: `${spf}all.js`,
    sync: `${spf}sync.js`,
  },
  flags: {
    rewriterLogs: false,
    scramitize: false,
    cleanErrors: true,
    sourcemaps: true,
  },
  codec: {
    encode,
    decode,
  },
});

window.scramjet = config;

export {};
