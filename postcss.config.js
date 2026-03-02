import cssnanoPlugin from "cssnano";
import presetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";

/** @type {import("postcss-load-config").Config} */
export default {
  plugins: [
    cssnanoPlugin({
      preset: [
        "default",
        {
          discardComments: {
            removeAll: true,
          },
        },
      ],
    }),
    presetEnv(),
    autoprefixer(),
  ],
};
