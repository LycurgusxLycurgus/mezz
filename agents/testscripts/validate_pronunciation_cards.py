import json
from collections import Counter
from pathlib import Path


GOLDEN_PATH = Path("js/assets/pronunciation-golden.json")
CORE_PATH = Path("js/assets/pronunciation-core.json")

REQUIRED_GOLDEN_FIELDS = {"id", "cluster", "es", "esMirror", "notaEs", "en", "enMirror"}
REQUIRED_CORE_FIELDS = {"id", "cluster", "es", "esMirror", "notaEs", "notaEn", "en", "enMirror"}


def main() -> None:
    golden_payload = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    core_payload = json.loads(CORE_PATH.read_text(encoding="utf-8"))

    golden_cards = golden_payload.get("goldenPronunciation", [])
    core_cards = core_payload.get("corePhoneticChunks", [])

    missing = []
    same_mirror = []

    for card in golden_cards:
        missing_fields = REQUIRED_GOLDEN_FIELDS - set(card.keys())
        if missing_fields:
            missing.append((card.get("id"), sorted(missing_fields)))

    for card in core_cards:
        missing_fields = REQUIRED_CORE_FIELDS - set(card.keys())
        if missing_fields:
            missing.append((card.get("id"), sorted(missing_fields)))
        if card.get("esMirror", "").strip().lower() == card.get("enMirror", "").strip().lower():
            same_mirror.append(card.get("id"))

    cluster_counts = Counter(c.get("cluster") for c in core_cards)

    print(f"golden={len(golden_cards)}")
    print(f"core={len(core_cards)}")
    print("core_by_cluster=", dict(sorted(cluster_counts.items())))

    if len(golden_cards) != 24 or len(core_cards) != 60:
        raise SystemExit(1)
    if set(cluster_counts.keys()) != set("ABCDEFGHIJ"):
        raise SystemExit(1)
    if any(v != 6 for v in cluster_counts.values()):
        raise SystemExit(1)
    if missing:
        print("missing:", missing[:5])
        raise SystemExit(1)
    if same_mirror:
        print("same_mirror:", same_mirror[:5])
        raise SystemExit(1)


if __name__ == "__main__":
    main()
