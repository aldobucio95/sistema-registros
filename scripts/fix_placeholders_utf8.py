# -*- coding: utf-8 -*-
"""Replace common mojibake in App.jsx placeholders and short UI strings (UTF-8)."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "src" / "App.jsx"

# Longest keys first
REPLACEMENTS = [
    ('placeholder="?Cu?l?"', 'placeholder="\u00bfCu\u00e1l?"'),
    ('placeholder="Ej. Juan P?rez L?pez"', 'placeholder="Ej. Juan P\u00e9rez L\u00f3pez"'),
    ('placeholder="Ej. Campamento J?venes 2027"', 'placeholder="Ej. Campamento J\u00f3venes 2027"'),
    ('placeholder="Nombre, ID VNPM o tel?fono?"', 'placeholder="Nombre, ID VNPM o tel\u00e9fono\u2026"'),
    ('placeholder="Nombre, tel?fono o ID VNPM?"', 'placeholder="Nombre, tel\u00e9fono o ID VNPM\u2026"'),
    ('placeholder="Buscar gasto por nombre?"', 'placeholder="Buscar gasto por nombre\u2026"'),
    ('placeholder="Detalle (opcional si eliges categor?a)"', 'placeholder="Detalle (opcional si eliges categor\u00eda)"'),
    ('placeholder="N?mero"', 'placeholder="N\u00famero"'),
    ('placeholder="Ej. folio / transacci?n"', 'placeholder="Ej. folio / transacci\u00f3n"'),
    ('placeholder="Ej. Juan P?rez"', 'placeholder="Ej. Juan P\u00e9rez"'),
    ('placeholder="Ej. Quer?taro"', 'placeholder="Ej. Quer\u00e9taro"'),
    ('placeholder="Nombre de opci?n"', 'placeholder="Nombre de opci\u00f3n"'),
    ('placeholder="Nombre de categor?a"', 'placeholder="Nombre de categor\u00eda"'),
    ('placeholder="Ej. Madre, padre, tutor?"', 'placeholder="Ej. Madre, padre, tutor\u2026"'),
    ('placeholder="Ej. Madre, tutor?"', 'placeholder="Ej. Madre, tutor\u2026"'),
]

def main():
    text = TARGET.read_text(encoding="utf-8")
    original = text
    reps = sorted(REPLACEMENTS, key=lambda x: len(x[0]), reverse=True)
    for old, new in reps:
        text = text.replace(old, new)
    if text == original:
        print("No placeholder changes", file=__import__("sys").stderr)
        return 1
    TARGET.write_text(text, encoding="utf-8", newline="\n")
    print(f"Updated {TARGET}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
