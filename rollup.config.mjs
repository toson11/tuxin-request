import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";
import alias from "@rollup/plugin-alias";
import { defineConfig } from "rollup";
import { dirname, resolve as pathResolve } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const aliasPlugin = alias({
  entries: [{ find: "@", replacement: pathResolve(__dirname, "src") }],
});

export default defineConfig([
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/index.umd.js",
        format: "umd",
        name: "TuxinRequest",
        sourcemap: true,
        globals: {
          axios: "axios",
          "crypto-js": "CryptoJS",
        },
      },
    ],
    // 外部依赖，不打包
    external: ["axios", "crypto-js"],
    plugins: [
      aliasPlugin,
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "./dist",
      }),
    ],
  },
  {
    input: "dist/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [aliasPlugin, dts()],
  },
]);
