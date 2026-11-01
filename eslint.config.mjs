import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The vendored media suite is imported verbatim from gn-apex, where the
  // crop/video/audio studios hand work-in-progress state through refs across
  // render boundaries and guard manual memoization. Rewriting them to please
  // the React compiler lint would drift the vendored copy — scope those
  // compiler rules off for exactly these files instead.
  {
    files: ["src/components/media/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
