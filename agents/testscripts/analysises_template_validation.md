## TS-ANALYSISES-001 - analysisEs template regression

Objective: Verify every card in `js/assets/core-words.json` uses the four-section `analysisEs` template and remains valid JSON.

Prerequisites:
- Python 3 available in PATH
- Run from repository root

Run command:

```bash
python -c "import json, pathlib; d=json.loads(pathlib.Path('js/assets/core-words.json').read_text(encoding='utf-8')); cards=d['coreWords']; bad=[]; [bad.append(c.get('id')) for c in cards if not (c.get('analysisEs','').startswith('Explicacion:') and '\\nTraduccion espejo:' in c.get('analysisEs','') and '\\nTraduccion literal:' in c.get('analysisEs','') and '\\nEjemplos:' in c.get('analysisEs','') and c.get('analysisEs','').count('/')>=2)]; print({'cards':len(cards),'invalid':len(bad),'sample':bad[:5]}); raise SystemExit(1 if bad else 0)"
```

Expected observation:
- Command exits with code `0`
- Output shows `invalid: 0`
