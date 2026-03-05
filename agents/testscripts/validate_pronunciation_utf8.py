import json
from pathlib import Path


GOLDEN_PATH = Path("js/assets/pronunciation-golden.json")
CORE_PATH = Path("js/assets/pronunciation-core.json")

EXPECTED_SPANISH = {
    "pron-golden-001": "El profesor de historia es fantástico.",
    "pron-golden-010": "El grupo escapó, observó y decidió continuar.",
    "pron-golden-013": "El doctor americano visita el hospital original con gran energía.",
    "pron-core-001": "¿Qué piensas?",
    "pron-core-007": "Esto es difícil.",
    "pron-core-020": "¿Puedo agregar eso?",
    "pron-core-025": "Amo este país.",
    "pron-core-043": "Siempre está ocupado.",
    "pron-core-051": "Muévete despacio.",
    "pron-core-060": "Edité el título.",
}


def main() -> None:
    golden_payload = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    core_payload = json.loads(CORE_PATH.read_text(encoding="utf-8"))
    merged = {}
    for card in golden_payload.get("goldenPronunciation", []):
        merged[card["id"]] = card
    for card in core_payload.get("corePhoneticChunks", []):
        merged[card["id"]] = card

    mismatches = []

    for card_id, expected in EXPECTED_SPANISH.items():
        actual = merged.get(card_id, {}).get("es")
        if actual != expected:
            mismatches.append((card_id, expected, actual))

    print(f"checked={len(EXPECTED_SPANISH)}")
    if mismatches:
        for row in mismatches[:5]:
            print("mismatch:", row)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
