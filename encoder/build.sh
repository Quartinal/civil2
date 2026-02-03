#!/usr/bin/env bash
set -e

em++ -O3 -std=c++20 \
  src/xor_encoder.cpp \
  src/bindings.cpp \
  --bind \
  -sMODULARIZE \
  -sEXPORT_ES6 \
  -sENVIRONMENT=web \
  -sEXPORT_NAME=XOREncoder \
  -sALLOW_MEMORY_GROWTH \
  -o xor_encoder.js
