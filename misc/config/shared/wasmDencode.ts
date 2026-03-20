import xorDencode from "$wasm/xor_encoder.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let scratch = new Uint8Array(4096);
let module: any;

export async function init() {
    module = await xorDencode();
    (globalThis as any)["__civil_xorWasm__"] = {
        mod: module,
        scratch: new Uint8Array(4096),
    };
}

const heap = () => {
    if (!module.cachedHeap || module.cachedHeap.buffer.byteLength === 0)
        module.cachedHeap = module.HEAPU8;
    return module.cachedHeap;
};

function writeToWasm(str: string) {
    const maxBytes = str.length * 3;
    if (scratch.length < maxBytes) scratch = new Uint8Array(maxBytes * 2);
    const { written } = textEncoder.encodeInto(str, scratch);
    const ptr = module.getInBuf(written);
    heap().set(scratch.subarray(0, written), ptr);
    return written;
}

function readFromWasm() {
    const ptr = module.getOutBuf();
    const len = module.outLen();
    return textDecoder.decode(heap().subarray(ptr, ptr + len));
}

export const setSearchEngine = (engine: string) =>
    module.setSearchEngine(engine);
export const setSearchTemplate = (template: string) =>
    module.setSearchTemplate(template);

export function encode(str: string) {
    if (!module)
        throw new Error("xor_encoder not initialized. call init() first.");
    const len = writeToWasm(str);
    module.encodeBuf(len);
    return readFromWasm();
}

export function decode(str: string) {
    if (!module)
        throw new Error("xor_encoder not initialized. call init() first.");
    const len = writeToWasm(str);
    module.decodeBuf(len);
    return readFromWasm();
}

export function scramjetEncode(str: string) {
    const state = (globalThis as any)["__civil_xorWasm__"];
    if (!state)
        throw new Error("xor_encoder not initialized. call init() first.");
    const { mod } = state;
    const maxBytes = str.length * 3;
    if (state.scratch.length < maxBytes)
        state.scratch = new Uint8Array(maxBytes * 2);
    const { written } = new TextEncoder().encodeInto(str, state.scratch);
    const ptr = mod.getInBuf(written);
    if (!mod.cachedHeap || mod.cachedHeap.buffer.byteLength === 0)
        mod.cachedHeap = mod.HEAPU8;
    mod.cachedHeap.set(state.scratch.subarray(0, written), ptr);
    mod.encodeBuf(written);
    const outPtr = mod.getOutBuf();
    const outLen = mod.outLen();
    if (!mod.cachedHeap || mod.cachedHeap.buffer.byteLength === 0)
        mod.cachedHeap = mod.HEAPU8;
    return new TextDecoder().decode(
        mod.cachedHeap.subarray(outPtr, outPtr + outLen),
    );
}

export function scramjetDecode(str: string) {
    const state = (globalThis as any)["__civil_xorWasm__"];
    if (!state)
        throw new Error("xor_encoder not initialized. call init() first.");
    const { mod } = state;
    const maxBytes = str.length * 3;
    if (state.scratch.length < maxBytes)
        state.scratch = new Uint8Array(maxBytes * 2);
    const { written } = new TextEncoder().encodeInto(str, state.scratch);
    const ptr = mod.getInBuf(written);
    if (!mod.cachedHeap || mod.cachedHeap.buffer.byteLength === 0)
        mod.cachedHeap = mod.HEAPU8;
    mod.cachedHeap.set(state.scratch.subarray(0, written), ptr);
    mod.decodeBuf(written);
    const outPtr = mod.getOutBuf();
    const outLen = mod.outLen();
    if (!mod.cachedHeap || mod.cachedHeap.buffer.byteLength === 0)
        mod.cachedHeap = mod.HEAPU8;
    return new TextDecoder().decode(
        mod.cachedHeap.subarray(outPtr, outPtr + outLen),
    );
}
