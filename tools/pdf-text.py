"""Dump the text of one or more PDFs so they can be read and cited.

    python tools/pdf-text.py <pdf> [<pdf> ...] [--out DIR]

Writes <name>.txt next to the source, or into --out when given, and prints a
one-line summary per file.
"""
import sys
import pathlib
from pypdf import PdfReader


def dump(path: pathlib.Path, out_dir: pathlib.Path | None) -> None:
    reader = PdfReader(str(path))
    parts = []
    for i, page in enumerate(reader.pages, 1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:  # a damaged page shouldn't lose the rest
            text = f"[page {i} could not be extracted: {exc}]"
        parts.append(f"\n\n=== page {i} ===\n{text}")

    body = "".join(parts).strip()
    target = (out_dir or path.parent) / (path.stem + ".txt")
    target.write_text(body, encoding="utf-8")
    print(f"{len(reader.pages):>3} pp  {len(body):>7} chars  {target.name}")


def main() -> None:
    args = sys.argv[1:]
    out_dir = None
    if "--out" in args:
        i = args.index("--out")
        out_dir = pathlib.Path(args[i + 1])
        out_dir.mkdir(parents=True, exist_ok=True)
        args = args[:i] + args[i + 2:]

    if not args:
        print(__doc__)
        raise SystemExit(1)

    for a in args:
        p = pathlib.Path(a)
        if p.exists():
            dump(p, out_dir)
        else:
            print(f"missing: {a}")


if __name__ == "__main__":
    main()
