import path       from "node:path";
import glob       from "glob";
import typescript from "@rollup/plugin-typescript";
import { generateDTS } from '@typhonjs-build-test/esm-d-ts';

const getRollupPluginsConfig = (compilerOptions) => {
  return [
    typescript({ ...compilerOptions })
  ];
};

// Find available plugins
const colordPluginPaths = glob.sync("./src/plugins/*.ts");

// Bundle both formats according to NodeJS guide
// https://nodejs.org/api/packages.html#packages_approach_2_isolate_state
export default [
  // Build the main bundle in both ESM and CJS modules
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "es",
      generatedCode: { constBindings: true }
    },
    plugins: [
      ...getRollupPluginsConfig({ declaration: false }),
      generateDTS.plugin()
    ]
  },

  // // Bundle all library plugins as ESM modules
  // ...colordPluginPaths.map((input) => ({
  //   input,
  //   // external: ['colord'],
  //   output: {
  //     file: `dist/plugins/${path.parse(input).name}.js`,
  //     format: "es",
  //     generatedCode: { constBindings: true }
  //   },
  //   plugins: [
  //     getRollupPluginsConfig({ declaration: false }),
  //     generateDTS.plugin()
  //   ]
  // }))
];
