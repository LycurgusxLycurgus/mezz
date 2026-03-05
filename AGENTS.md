# AGENTS.md




 2) Specific repo rules
 - Home desktop alignment rule: every new/edited home header block must be centered at desktop width using a bounded container (`max-width` + `margin: 0 auto`) and centered headline text. Do not ship home changes without checking 1440px+ screenshots.
 - Home mode controls rule: `Estructura/FonÃ©tica` toggle buttons must be centered as a group on desktop and mobile (`margin: auto` or equivalent). Never leave them left-aligned relative to centered headlines.
 - UTF-8 data rule: any JSON/TXT content with Spanish text must be written as UTF-8 (`ensure_ascii=false` for Python serializers). Never run global character replacement commands over datasets (for example replacing `?`) because they can silently destroy accents and punctuation.
 - Card editing workflow rule: never edit runtime card JSONs directly first. Always edit a simplified working file in agents/cards (default format: TSV), validate, then sync to js/assets/*.json.
