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
];

export default eslintConfig;
