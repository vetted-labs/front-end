import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "react/no-danger": "warn",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["pg", "postgres", "postgresql"],
              message:
                "❌ SECURITY: Frontend must NEVER access database directly. Use backend API.",
            },
            {
              group: ["**/db.ts", "**/db.js", "*/db"],
              message:
                "❌ SECURITY: Frontend must NEVER import database utilities. Use backend API.",
            },
            {
              group: [
                "**/backend/**",
                "../backend/**",
                "../../backend/**",
              ],
              message:
                "❌ ARCHITECTURE: Frontend must NEVER import backend code. Use API calls.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.name='useEffect'], CallExpression[callee.object.name='React'][callee.property.name='useEffect']",
          message:
            "Avoid direct useEffect. Derive state inline, use useFetch for data fetching, use event handlers for actions, or use useMountEffect for mount-only external system sync.",
        },
      ],
    },
  },
  {
    // Docs are prose-heavy; apostrophes and quotes in body content are intentional
    // and don't need to be HTML-escaped. Disable the unescaped-entities rule for
    // the docs route tree and its supporting components.
    files: [
      "src/app/docs/**/*.{ts,tsx}",
      "src/components/docs/**/*.{ts,tsx}",
    ],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
