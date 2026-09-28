/**
 * Lint the PL/pgSQL function bodies in our migrations for block-structure
 * errors.
 *
 * Written after 0053 shipped with the exception block closed with `END IF;`
 * instead of `END;`. PostgreSQL rejected it with:
 *
 *   ERROR: 42601: syntax error at or near "IF"
 *
 * `END IF` may only close an `IF`; a `BEGIN ... EXCEPTION ... END;` block must
 * be closed with a bare `END`. The two are easy to get wrong by hand and
 * impossible to eyeball reliably across 600 lines of SQL.
 *
 * This is a structural check only - it cannot replace running the migration.
 * But it reliably catches the specific class of error above.
 *
 * Usage: node scripts/lint-plpgsql.mjs [file ...]
 * With no arguments, lints every .sql under supabase/migrations.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = path.join(__dirname, "..", "supabase", "migrations");

// Strip line comments and quoted strings/literals so keywords inside them
// are never counted.
//
// The comment strip must tolerate CRLF: these files have Windows line
// endings, and in JS `.` does not match `\r`, so a naive `/--.*$/` fails to
// match at all on a CRLF line. That silently left comments in the text and
// made the word "if" inside a comment (e.g. "(if replying to a reply)")
// count as a block keyword.
function scrub(line) {
  return line
    .replace(/\r/, "")
    .replace(/--[^\n]*/, "")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\$[^$]*\$/g, "$$");
}

// Keywords in match order. END IF / END CASE / END LOOP must be tested before
// the bare END, otherwise END IF would be read as a bare END.
const KEYWORDS = /\b(END\s+IF|END\s+CASE|END\s+LOOP|END|BEGIN|CASE|LOOP|IF)\b/gi;

const OPENS = new Set(["BEGIN", "CASE", "LOOP", "IF"]);

/**
 * Walk one dollar-quoted function body and return { ok, problems[] }.
 * Maintains a stack so `END IF` closing a `BEGIN` is reported as a mismatch
 * rather than silently passing.
 */
function lintBody(body, file, startLine) {
  const stack = [];
  const problems = [];
  const lines = body.split("\n");

  lines.forEach((raw, i) => {
    const lineNo = startLine + i;
    const line = scrub(raw);
    let match;
    KEYWORDS.lastIndex = 0;

    while ((match = KEYWORDS.exec(line)) !== null) {
      const kw = match[1].replace(/\s+/g, " ").toUpperCase();
      const isEnd = kw.startsWith("END");

      if (!isEnd) {
        // `IF` in plpgsql always opens a block and is closed by END IF.
        stack.push({ kw, lineNo });
        continue;
      }

      if (kw === "END") {
        // A bare END legitimately closes a BEGIN block, a LOOP, or a SQL
        // `CASE ... END` *expression* (which is not the plpgsql CASE
        // statement - that one requires `END CASE`). It must NOT close an IF:
        // a plpgsql IF is only ever closed by `END IF`.
        const top = stack.pop();
        if (!top) {
          problems.push(`line ${lineNo}: bare END with no open block`);
        } else if (top.kw === "IF") {
          problems.push(
            `line ${lineNo}: bare END closes an IF opened at line ${top.lineNo} ` +
              `- expected \`END IF;\``,
          );
        }
        continue;
      }

      // END IF / END CASE / END LOOP
      const want = kw.slice(4); // "IF" | "CASE" | "LOOP"
      const top = stack.pop();
      if (!top) {
        problems.push(`line ${lineNo}: END ${want} with no open ${want}`);
      } else if (top.kw !== want) {
        problems.push(
          `line ${lineNo}: END ${want} closes a ${top.kw} opened at line ` +
            `${top.lineNo} - expected \`END ${top.kw};\``,
        );
      }
    }
  });

  for (const unclosed of stack) {
    problems.push(
      `line ${unclosed.lineNo}: ${unclosed.kw} never closed (end of function body)`,
    );
  }

  if (problems.length > 0) {
    problems.unshift(`${file}:`);
  }
  return problems;
}

function lintFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const problems = [];

  // Find each $$ ... $$ dollar-quoted body (plpgsql function source).
  const re = /\$\$\s*\n([\s\S]*?)\n\$\$\s*;/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const bodyStartLine = text.slice(0, match.index).split("\n").length;
    problems.push(...lintBody(match[1], file, bodyStartLine + 1));
  }

  if (problems.length === 0) {
    console.log(`  ok    ${path.basename(file)}`);
  } else {
    for (const p of problems) console.log(`  FAIL  ${p}`);
  }
  return problems.length;
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs
      .readdirSync(DEFAULT_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => path.join(DEFAULT_DIR, f));

console.log(`Linting PL/pgSQL block structure in ${files.length} file(s)\n`);

let failures = 0;
for (const file of files) {
  failures += lintFile(file);
}

console.log();
if (failures > 0) {
  console.error(`FAILED: ${failures} block-structure problem(s) found.`);
  process.exit(1);
}
console.log("All function bodies are structurally balanced.");
