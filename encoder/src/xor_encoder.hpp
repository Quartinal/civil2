#pragma once
#include <string>

namespace xorenc {
    void set_search_engine(const std::string& name);
    void set_search_template(const std::string& tpl);
    std::string encode(const std::string& input);
    std::string decode(const std::string& input);
}
