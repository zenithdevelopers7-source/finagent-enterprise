"""Control mutation checks (CLAUDE.md "break it, confirm a test fails, restore it").

Each entry in tests/mutations.yaml names a source file, an exact snippet that implements a control,
a replacement that disables it, and the tests expected to catch it. For each mutation the file is
patched, the tests run, and the original is ALWAYS restored (even on Ctrl-C). A mutation that no
test catches ("SURVIVED") makes the script exit non-zero.

Usage: python scripts/mutation_check.py [mutation-id ...]
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import yaml
from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

ROOT = Path(__file__).resolve().parents[1]


def classify_result(returncode: int, report: Path) -> str:
    """Accept only executed, error-free tests as evidence of a caught or surviving mutation."""
    try:
        root = ElementTree.parse(report).getroot()
        suites = list(root.iter("testsuite"))
        if not suites:
            return "ERROR"
        counts = {
            name: sum(int(suite.attrib.get(name, "0")) for suite in suites)
            for name in ("tests", "failures", "errors", "skipped")
        }
        if counts["tests"] < 1 or counts["errors"] or counts["skipped"]:
            return "ERROR"
        if returncode == 1 and counts["failures"] > 0:
            return "CAUGHT"
        if returncode == 0 and counts["failures"] == 0:
            return "SURVIVED"
    except (OSError, ValueError, ElementTree.ParseError, DefusedXmlException):
        pass
    return "ERROR"


def select_mutations(mutations: list[dict], selected: list[str]) -> list[dict]:
    """Reject empty or unknown selections before modifying any source files."""
    if not mutations:
        raise ValueError("Mutation catalog is empty")
    unknown = set(selected) - {m["id"] for m in mutations}
    if unknown:
        raise ValueError(f"Unknown mutation IDs: {', '.join(sorted(unknown))}")
    return [m for m in mutations if m["id"] in selected] if selected else mutations


def main(selected: list[str]) -> int:
    catalog = yaml.safe_load((ROOT / "tests/mutations.yaml").read_text(encoding="utf-8"))
    try:
        mutations = select_mutations(catalog, selected)
    except ValueError as exc:
        print(f"[ERROR]    {exc}")
        return 1
    survived: list[str] = []
    for m in mutations:
        path = ROOT / m["file"]
        original = path.read_text(encoding="utf-8")
        if original.count(m["find"]) != 1:
            print(f"[ERROR]    {m['id']}: snippet not found exactly once in {m['file']}")
            survived.append(m["id"])
            continue
        with tempfile.TemporaryDirectory(prefix="finagent-mutation-") as temp_dir:
            report = Path(temp_dir) / "result.xml"
            try:
                path.write_text(original.replace(m["find"], m["replace"]), encoding="utf-8")
                proc = subprocess.run(  # noqa: S603 - fixed argv
                    [
                        sys.executable,
                        "-m",
                        "pytest",
                        "-q",
                        "-p",
                        "no:warnings",
                        "-x",
                        f"--junitxml={report}",
                        *m["tests"],
                    ],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
            finally:
                path.write_text(original, encoding="utf-8")
            status = classify_result(proc.returncode, report)
        summary = (proc.stdout.strip().splitlines() or ["(no output)"])[-1]
        print(f"[{status:8}] {m['id']}: {m['control']} -> {summary}")
        if status != "CAUGHT":
            survived.append(m["id"])
    print(f"\n{len(mutations) - len(survived)}/{len(mutations)} mutations caught")
    return 1 if survived else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
