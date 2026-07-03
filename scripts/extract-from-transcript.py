import json
import os
import re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\Dev\.cursor\projects\c-Users-Dev-Documents-uloahia\agent-transcripts"
    r"\96834272-3001-44ff-98fd-1129c6d77266\96834272-3001-44ff-98fd-1129c6d77266.jsonl"
)
ROOT = Path(r"C:\Users\Dev\Documents\uloahia")


def normalize_path(path: str) -> Path | None:
    path = path.strip().replace("\\", "/")
    marker = "uloahia/"
    lower = path.lower()
    idx = lower.find(marker)
    if idx == -1:
        return None
    rel = path[idx + len(marker) :]
    return ROOT / rel.replace("/", os.sep)


def apply_update_file(patch: str, disk: dict[str, str]) -> None:
    match = re.search(r"\*\*\* Update File: ([^\n]+)\n([\s\S]*?)\n\*\*\* End Patch", patch)
    if not match:
        return
    path = match.group(1).strip().replace("\\", "/")
    body = match.group(2)
    current = disk.get(path)
    if current is None:
        out = normalize_path(path)
        if out and out.exists():
            current = out.read_text(encoding="utf-8")
        else:
            return
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
    disk[path] = "\n".join(lines)


def apply_add_file(patch: str, disk: dict[str, str]) -> None:
    for match in re.finditer(
        r"\*\*\* Add File: ([^\n]+)\n\+([\s\S]*?)(?=\n\*\*\* End Patch|\Z)",
        patch,
    ):
        path = match.group(1).strip().replace("\\", "/")
        body = match.group(2)
        body = "\n".join(line[1:] if line.startswith("+") else line for line in body.splitlines())
        disk[path] = body


def apply_write(payload: dict, disk: dict[str, str]) -> None:
    path = payload.get("path", "")
    contents = payload.get("contents")
    if path and contents is not None:
        disk[payload["path"].replace("\\", "/")] = contents


def main() -> None:
    disk: dict[str, str] = {}
    events: list[tuple[str, object]] = []

    for line in TRANSCRIPT.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("role") != "assistant":
            continue
        content = obj.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for item in content:
            if not isinstance(item, dict) or item.get("type") != "tool_use":
                continue
            name = item.get("name")
            payload = item.get("input")
            events.append((name, payload))

    for name, payload in events:
        if name == "Write" and isinstance(payload, dict):
            apply_write(payload, disk)
        elif name == "ApplyPatch" and isinstance(payload, str):
            if "*** Add File:" in payload:
                apply_add_file(payload, disk)
            elif "*** Update File:" in payload:
                apply_update_file(payload, disk)

    written = 0
    for path, body in disk.items():
        out = normalize_path(path)
        if not out:
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(body.rstrip() + "\n", encoding="utf-8", newline="\n")
        written += 1

    print(f"Processed {len(events)} tool events")
    print(f"Final {len(disk)} files; wrote {written} to {ROOT}")


if __name__ == "__main__":
    main()
