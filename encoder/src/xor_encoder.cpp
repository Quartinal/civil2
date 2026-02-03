#include "xor_encoder.hpp"
#include <cctype>
#include <unordered_map>
#include <string>
#include <string_view>

namespace xorenc {

    static const std::unordered_map<std::string, std::string> engines = {
        { "google", "https://www.google.com/search?q=%s" },
        { "ddg",    "https://duckduckgo.com/?q=%s" },
        { "bing",   "https://www.bing.com/search?q=%s" },
        { "brave",  "https://search.brave.com/search?q=%s" },
        { "searx",  "https://searx.org/search?q=%s" }
    };

    static std::string search_template = engines.at("google");

    void set_search_engine(const std::string& name) {
        auto it = engines.find(name);
        if (it != engines.end()) {
            search_template = it->second;
        }
    }

    void set_search_template(const std::string& tpl) {
        if (tpl.find("%s") != std::string::npos) {
            search_template = tpl;
        }
    }

    std::string encode(const std::string& input);
    std::string decode(const std::string& input);

    constexpr bool is_unreserved(unsigned char c) noexcept {
        return std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~';
    }

    std::string percent_encode(std::string_view in) {
        std::string out;
        out.reserve(in.size() * 3);

        constexpr char hex[] = "0123456789ABCDEF";

        for (unsigned char c : in) {
            if (is_unreserved(c)) {
                out.push_back(c);
            } else {
                out.push_back('%');
                out.push_back(hex[c >> 4]);
                out.push_back(hex[c & 0x0F]);
            }
        }
        return out;
    }

    static unsigned char from_hex(char c) noexcept {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        return 0;
    }

    std::string percent_decode(std::string_view in) {
        std::string out;
        out.reserve(in.size());

        for (size_t i = 0; i < in.size(); ++i) {
            if (in[i] == '%' && i + 2 < in.size()) {
                unsigned char v =
                    (from_hex(in[i + 1]) << 4) |
                     from_hex(in[i + 2]);
                out.push_back(static_cast<char>(v));
                i += 2;
            } else {
                out.push_back(in[i]);
            }
        }
        return out;
    }

    std::string xor_transform(std::string_view in) {
        std::string out(in);
        for (size_t i = 1; i < out.size(); i += 2) {
            out[i] ^= 0x02;
        }
        return out;
    }

    static bool has_scheme(std::string_view s) {
        return s.starts_with("http://") || s.starts_with("https://");
    }

    static bool looks_like_domain(std::string_view s) {
        return s.find('.') != std::string_view::npos &&
               s.find(' ') == std::string_view::npos;
    }

    std::string normalize(std::string_view input) {
        if (input.empty()) return {};

        if (has_scheme(input))
            return std::string(input);

        if (looks_like_domain(input))
            return "https://" + std::string(input);

        std::string q = percent_encode(input);
        std::string out = search_template;
        out.replace(out.find("%s"), 2, q);
        return out;
    }

    std::string encode(const std::string& input) {
        if (input.empty()) return {};
        std::string norm = normalize(input);
        std::string enc  = percent_encode(norm);
        std::string x    = xor_transform(enc);
        return percent_encode(x);
    }

    std::string decode(const std::string& input) {
        if (input.empty()) return {};
        std::string dec = percent_decode(input);
        std::string x   = xor_transform(dec);
        return percent_decode(x);
    }

} // namespace xorenc
