"""Mutation outcomes must distinguish assertion failures from test errors and skips."""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml
from scripts.mutation_check import classify_result, select_mutations

ROOT = Path(__file__).resolve().parents[2]


def test_mutation_selection_rejects_unknown_or_empty_catalog() -> None:
    catalog = [{"id": "first"}, {"id": "second"}]
    assert select_mutations(catalog, []) == catalog
    assert select_mutations(catalog, ["second"]) == [{"id": "second"}]
    with pytest.raises(ValueError, match="Unknown mutation IDs"):
        select_mutations(catalog, ["first", "misspelled"])
    with pytest.raises(ValueError, match="catalog is empty"):
        select_mutations([], [])


@pytest.mark.parametrize(
    ("returncode", "tests", "failures", "errors", "skipped", "expected"),
    [
        (1, 1, 1, 0, 0, "CAUGHT"),
        (1, 1, 0, 1, 0, "ERROR"),
        (1, 2, 1, 1, 0, "ERROR"),
        (1, 2, 1, 0, 1, "ERROR"),
        (0, 1, 0, 0, 0, "SURVIVED"),
        (0, 1, 0, 0, 1, "ERROR"),
        (0, 0, 0, 0, 0, "ERROR"),
        (2, 1, 1, 0, 0, "ERROR"),
    ],
)
def test_outcome_requires_a_valid_executed_test(
    tmp_path: Path, returncode: int, tests: int, failures: int, errors: int, skipped: int, expected: str
) -> None:
    report = tmp_path / "results.xml"
    report.write_text(
        f'<testsuites><testsuite tests="{tests}" failures="{failures}" '
        f'errors="{errors}" skipped="{skipped}"/></testsuites>',
        encoding="utf-8",
    )
    assert classify_result(returncode, report) == expected


def test_missing_or_invalid_report_is_an_error(tmp_path: Path) -> None:
    report = tmp_path / "results.xml"
    assert classify_result(1, report) == "ERROR"
    report.write_text("<not-valid", encoding="utf-8")
    assert classify_result(1, report) == "ERROR"


def test_snapshot_mutation_preserves_document_trigger_needed_by_later_migration() -> None:
    mutations = yaml.safe_load((ROOT / "tests/mutations.yaml").read_text(encoding="utf-8"))
    mutation = next(item for item in mutations if item["id"] == "snapshot-immutability-trigger")
    source = (ROOT / mutation["file"]).read_text(encoding="utf-8")
    assert source.count(mutation["find"]) == 1
    modified = ast.parse(source.replace(mutation["find"], mutation["replace"]))
    upgrade = next(
        node for node in modified.body if isinstance(node, ast.FunctionDef) and node.name == "upgrade"
    )
    loop = next(
        node
        for node in upgrade.body
        if isinstance(node, ast.For)
        and isinstance(node.iter, ast.Name)
        and node.iter.id == "IMMUTABLE_TABLES"
    )
    emitted: list[str] = []
    module = ast.fix_missing_locations(ast.Module(body=[loop], type_ignores=[]))
    namespace = {
        "IMMUTABLE_TABLES": ("evidence_snapshots", "evidence_snapshot_items", "document_extractions"),
        "op": SimpleNamespace(execute=emitted.append),
    }
    exec(compile(module, mutation["file"], "exec"), namespace)  # noqa: S102 - trusted repository fixture
    assert len(emitted) == 1
    assert "document_extractions_immutable" in emitted[0]
