import {
    init,
    setSearchEngine,
    scramjetEncode,
    scramjetDecode,
} from "$config/shared/wasmDencode";
import genProxyPath from "$config/shared/genProxyPath";

init().then(() => {
    setSearchEngine(localStorage.getItem("search")! || "google");

    const { ScramjetController } = $scramjetLoadController();
    const proxyPath = genProxyPath("/", "scramjet");
    const spf = `${proxyPath}scramjet.`;

    const config = new ScramjetController({
        prefix: "/~/scramjet/",
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
        codec: { encode: scramjetEncode, decode: scramjetDecode },
    });

    window.scramjet = config;
    window.scramjet.init();
});
