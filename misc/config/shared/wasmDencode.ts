import xorDencode from "$wasm/xor_encoder.js";

export const { encode, decode, setSearchEngine, setSearchTemplate } =
  await xorDencode();
