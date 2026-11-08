import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_source_corpus_is_present():
    dataset_path = (
        ROOT / "data/processed/scholarship_dataset_ready.json"
        if (ROOT / "data/processed/scholarship_dataset_ready.json").exists()
        else ROOT / "data/scholarship_dataset_ready.json"
    )
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    assert dataset["record_count"] == 16
    assert len(dataset["schemes"]) == 16
    assert dataset["source_record_count"] == 18
    assert dataset["duplicates_removed"] == 2
