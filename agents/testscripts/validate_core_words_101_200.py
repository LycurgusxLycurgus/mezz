import json
import re
from pathlib import Path


FILE_PATH = Path("js/assets/core-words.json")

UNCHANGED_CONTEXTS = {
    "core-105": "We talked about the new project this morning.",
    "core-107": "I will see you at noon.",
    "core-108": "I left my keys in the car.",
    "core-109": "The book is on the table.",
    "core-112": "We talked over the new project this morning.",
}

CHANGED_IDS = [
    f"core-{n:03d}"
    for n in range(101, 201)
    if n not in {105, 107, 108, 109, 112}
]

LEGACY_CONTEXT_PATTERNS = [
    re.compile(r"^This\s+[A-Za-z']+\s+idea helped us solve the problem\.$"),
    re.compile(
        r"^We talked\s+(for|with|from|by|as|into|under|between|among|around|across|along|through|during|within|without|behind|beyond|inside|outside|near|toward|towards)\s+the new project this morning\.$"
    ),
    re.compile(r"^I\s+(yesterday|somewhere|anywhere|nowhere)\s+this task every morning\.$"),
    re.compile(
        r"^She explained it\s+(usually|only|probably|definitely|certainly|actually|basically), so everyone understood\.$"
    ),
]


def card_number(card_id: str) -> int:
    return int(card_id.split("-")[1])


def check_analysis_template(text: str) -> bool:
    required = ["Explicacion:", "Traduccion espejo:", "Traduccion literal:", "Ejemplos:"]
    if any(token not in text for token in required):
        return False
    ejemplos = text.split("Ejemplos:", 1)[1].strip()
    pairs = [p.strip() for p in ejemplos.split(" | ") if p.strip()]
    if len(pairs) < 2:
        return False
    return all(" / " in p for p in pairs)


def is_legacy_context(context: str) -> bool:
    return any(pattern.match(context) for pattern in LEGACY_CONTEXT_PATTERNS)


def main() -> None:
    payload = json.loads(FILE_PATH.read_text(encoding="utf-8"))
    scoped = [c for c in payload["coreWords"] if 101 <= card_number(c["id"]) <= 200]
    by_id = {c["id"]: c for c in scoped}

    legacy_hits = []
    analysis_fail = []
    unchanged_fail = []

    for card_id in CHANGED_IDS:
        card = by_id[card_id]
        if is_legacy_context(card["context"]):
            legacy_hits.append(card_id)
        if not check_analysis_template(card["analysisEs"]):
            analysis_fail.append(card_id)

    for card_id, expected in UNCHANGED_CONTEXTS.items():
        if by_id[card_id]["context"] != expected:
            unchanged_fail.append(card_id)

    print("JSON parse: OK")
    print(f"Scoped cards checked: {len(scoped)}")
    print(f"Changed cards verified: {len(CHANGED_IDS)}")
    print(f"Legacy-context check: {'OK' if not legacy_hits else 'FAIL'}")
    if legacy_hits:
        print("Legacy contexts still present -> " + ", ".join(sorted(legacy_hits)))

    print(f"analysisEs template check: {'OK' if not analysis_fail else 'FAIL'}")
    if analysis_fail:
        print("analysisEs invalid -> " + ", ".join(sorted(analysis_fail)))

    print(f"Unchanged-context check: {'OK' if not unchanged_fail else 'FAIL'}")
    if unchanged_fail:
        print("Unexpected context changes -> " + ", ".join(sorted(unchanged_fail)))


if __name__ == "__main__":
    main()
