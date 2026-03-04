import json
from pathlib import Path


FILE_PATH = Path("js/assets/core-words.json")

EXPECTED_CONTEXT_UPDATES = {
    "core-009": "Do you have any questions before we start?",
    "core-010": "There is no sugar left.",
    "core-011": "None of the answers were correct.",
    "core-012": "Each student got a feedback sheet.",
    "core-013": "Every student got a feedback sheet.",
    "core-014": "You can take either bus to downtown.",
    "core-015": "Neither option fits our budget.",
    "core-019": "Could you send me another example?",
    "core-021": "Some students finished early, but others needed more time.",
    "core-022": "We made the same mistake again.",
    "core-023": "I have never seen such a big crowd.",
    "core-031": "This notebook is mine.",
    "core-032": "Is this seat yours?",
    "core-033": "That blue jacket is hers.",
    "core-034": "The final decision is ours.",
    "core-035": "Those keys are theirs.",
    "core-036": "We built our own tool for this task.",
    "core-038": "We have little time left.",
    "core-040": "We do not have much time today.",
    "core-042": "We need less sugar in this recipe.",
    "core-046": "We need one more minute to finish.",
    "core-047": "The red shoes are expensive, but the black ones are on sale.",
    "core-052": "First, check the file name.",
    "core-053": "I will call you in a second.",
    "core-054": "I will see you next week.",
    "core-055": "Last week was very busy.",
    "core-079": "Somebody left their umbrella here.",
    "core-080": "Did anybody call while I was out?",
    "core-081": "Everybody enjoyed the workshop.",
    "core-092": "Why did you cancel the meeting?",
    "core-093": "How does this feature work?",
    "core-094": "You can choose whatever color you like.",
    "core-095": "Take whichever seat is free.",
    "core-096": "Whoever arrives first should open the door.",
    "core-097": "Call me whenever you need help.",
    "core-098": "Sit wherever you feel comfortable.",
}

CORE_001_CONTEXT = "Please send me the file from yesterday."


def card_number(card_id: str) -> int:
    return int(card_id.split("-")[1])


def load_worktree_version() -> dict:
    return json.loads(FILE_PATH.read_text(encoding="utf-8"))


def as_map(payload: dict) -> dict:
    scoped = [c for c in payload["coreWords"] if 1 <= card_number(c["id"]) <= 100]
    return {c["id"]: c for c in scoped}


def check_analysis_template(text: str) -> bool:
    required = ["Explicacion:", "Traduccion espejo:", "Traduccion literal:", "Ejemplos:"]
    if any(token not in text for token in required):
        return False
    ejemplos = text.split("Ejemplos:", 1)[1].strip()
    pairs = [p.strip() for p in ejemplos.split(" | ") if p.strip()]
    if len(pairs) < 2:
        return False
    return all(" / " in p for p in pairs)


def main() -> None:
    now = as_map(load_worktree_version())

    context_matched = []
    analysis_template_ok = []
    invalid_analysis_template = []
    context_mismatch = []

    for card_id, expected_context in EXPECTED_CONTEXT_UPDATES.items():
        current = now[card_id]
        if current["context"] == expected_context:
            context_matched.append(card_id)
        else:
            context_mismatch.append(card_id)

        if check_analysis_template(current["analysisEs"]):
            analysis_template_ok.append(card_id)
        else:
            invalid_analysis_template.append(card_id)

    print("JSON parse: OK")
    print(f"Scoped cards checked: {len(now)}")
    print(f"Context updates verified ({len(context_matched)}): {', '.join(sorted(context_matched))}")
    print(f"analysisEs template verified ({len(analysis_template_ok)}): {', '.join(sorted(analysis_template_ok))}")
    print(f"core-001 context unchanged: {now['core-001']['context'] == CORE_001_CONTEXT}")

    if context_mismatch:
        print("Context verification: FAIL -> " + ", ".join(sorted(context_mismatch)))
    else:
        print("Context verification: OK")

    if invalid_analysis_template:
        print(
            "analysisEs template check: FAIL -> "
            + ", ".join(sorted(invalid_analysis_template))
        )
    else:
        print("analysisEs template check: OK")


if __name__ == "__main__":
    main()
