import XOREncoder from "./xor_encoder.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Module = await XOREncoder({
  locateFile(file) {
    return path.join(__dirname, file);
  },
  wasmBinary: fs.readFileSync(path.join(__dirname, "xor_encoder.wasm")),
});

Module.setSearchEngine("ddg");

console.log(Module.encode("wasm xor encoder"));
