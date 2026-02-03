#include <emscripten/bind.h>
#include "xor_encoder.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(xor_encoder) {
    function("encode", &xorenc::encode);
    function("decode", &xorenc::decode);
    function("setSearchEngine", &xorenc::set_search_engine);
    function("setSearchTemplate", &xorenc::set_search_template);
}
