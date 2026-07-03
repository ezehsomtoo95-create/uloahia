"""Extract final file contents by replaying Write, StrReplace, and Update patches."""
import json
import re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\Dev\.cursor\projects\c-Users-Dev-Documents-uloahia\agent-transcripts"
    r"\96834272-3001-44ff-98fd-1129c6d77266\96834272-3001-44ff-98fd-1129c6d77266.jsonl"
)
ROOT = Path(r"C:\Users\Dev\Documents\uloahia")
OUT = ROOT / "_extracted_final"


def norm_path(path: str) -> str:
    return path.strip().replace("\\", "/").split("uloahia/")[-1]


def apply_update_file(patch: str, current: str) -> str:
    match = re.search(r"\*\*\* Update File: ([^\n]+)\n([\s\S]*?)\n\*\*\* End Patch", patch)
    if not match:
        return current
    body = match.group(2)
    lines = current.splitlines()
    hunks = re.split(r"\n@@[^\n]*\n", body)
    if hunks and not hunks[0].strip():
        hunks = hunks[1:]
    for hunk in hunks:
        if not hunk.strip():
            continue
        old_lines: list[str] = []
        new_lines: list[str] = []
        for line in hunk.splitlines():
            if line.startswith("+"):
                new_lines.append(line[1:])
            elif line.startswith("-"):
                old_lines.append(line[1:])
            elif line.startswith(" "):
                old_lines.append(line[1:])
                new_lines.append(line[1:])
        if not old_lines:
            continue
        old_block = "\n".join(old_lines)
        new_block = "\n".join(new_lines)
        text = "\n".join(lines)
        if old_block not in text:
            continue
        text = text.replace(old_block, new_block, 1)
        lines = text.splitlines()
    return "\n".join(lines)


def apply_add_file(patch: str) -> tuple[str, str] | None:
    match = re.search(
        r"\*\*\* Add File: ([^\n]+)\n\+([\s\S]*?)(?=\n\*\*\* End Patch|\Z)",
        patch,
    )
    if not match:
        return None
    path = norm_path(match.group(1))
    body = match.group(2)
    body = "\n".join(line[1:] if line.startswith("+") else line for line in body.splitlines())
    return path, body


def normalize(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def apply_str_replace(current: str, old: str, new: str) -> str | None:
    current_n = normalize(current)
    old_n = normalize(old)
    new_n = normalize(new)
    if old_n in current_n:
        return current_n.replace(old_n, new_n, 1)
    return None


def main() -> None:
    disk: dict[str, str] = {}

    for line in TRANSCRIPT.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("role") != "assistant":
            continue
        for item in obj.get("message", {}).get("content", []):
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            payload = item.get("input")

            if name == "Write" and isinstance(payload, dict):
                path = norm_path(payload.get("path", ""))
                contents = payload.get("contents")
                if path and contents is not None:
                    disk[path] = normalize(contents)
            elif name == "StrReplace" and isinstance(payload, dict):
                path = norm_path(payload.get("path", ""))
                old = payload.get("old_string")
                new = payload.get("new_string")
                if not path or old is None or new is None:
                    continue
                current = disk.get(path)
                if current is None:
                    fp = ROOT / path.replace("/", "\\")
                    if fp.exists():
                        current = fp.read_text(encoding="utf-8")
                    else:
                        continue
                updated = apply_str_replace(current, old, new)
                if updated is not None:
                    disk[path] = updated
            elif name == "ApplyPatch" and isinstance(payload, str):
                if "*** Add File:" in payload:
                    result = apply_add_file(payload)
                    if result:
                        disk[result[0]] = result[1]
                elif "*** Update File:" in payload:
                    m = re.search(r"\*\*\* Update File: ([^\n]+)", payload)
                    if not m:
                        continue
                    path = norm_path(m.group(1))
                    current = disk.get(path)
                    if current is None:
                        fp = ROOT / path.replace("/", "\\")
                        if fp.exists():
                            current = fp.read_text(encoding="utf-8")
                        else:
                            continue
                    updated = apply_update_file(payload, normalize(current))
                    if updated != normalize(current):
                        disk[path] = updated

    written = 0
    for t in sorted(disk.keys()):
        out = ROOT / t.replace("/", "\\")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(disk[t].rstrip() + "\n", encoding="utf-8", newline="\n")
        written += 1

    print(f"Wrote {written} files to {ROOT}")


if __name__ == "__main__":
    main()
