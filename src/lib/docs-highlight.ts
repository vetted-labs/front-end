import { codeToHtml, type BundledLanguage } from "shiki";

const LANG_MAP: Record<string, BundledLanguage> = {
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
  tsx: "tsx",
  jsx: "jsx",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "shellscript",
  sql: "sql",
  css: "css",
  html: "html",
  python: "python",
  py: "python",
  rust: "rust",
  rs: "rust",
  go: "go",
  markdown: "markdown",
  md: "markdown",
  // Vetted-specific: pseudocode we write in docs is TypeScript-ish
  pseudocode: "typescript",
};

function normalizeLang(lang: string | undefined): BundledLanguage | "plaintext" {
  if (!lang) return "plaintext";
  const lower = lang.toLowerCase();
  return LANG_MAP[lower] ?? "plaintext";
}

/**
 * Build-time code highlighter used by `DocsCodeBlock`.
 *
 * Uses shiki's `codeToHtml` with a light+dark paired theme. The returned HTML
 * contains TWO `<pre>` blocks — one for each theme — and CSS in globals.css
 * shows/hides based on the current color scheme.
 */
export async function highlightCode(
  code: string,
  lang: string | undefined
): Promise<string> {
  const language = normalizeLang(lang);
  return codeToHtml(code.trimEnd(), {
    lang: language,
    themes: {
      light: "github-light",
      dark: "github-dark-dimmed",
    },
    defaultColor: false,
  });
}
