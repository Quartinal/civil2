import xorDencode from "$wasmEncode/xor_encoder.js";

export const { encode, decode, setSearchEngine, setSearchTemplate } =
  await xorDencode();
