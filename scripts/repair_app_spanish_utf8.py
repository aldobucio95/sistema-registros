# -*- coding: utf-8 -*-
"""
Reparación puntual de U+FFFD y patrones típicos en src/App.jsx.
Normaliza finales de línea a LF. Ejecutar solo si aparecen caracteres corruptos.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "src" / "App.jsx"

PATTERN_LINE_187 = re.compile(
    r"/\*\* Valor can[^\n]*?S\?[^\n]*?\*/",
    re.DOTALL,
)
REPL_LINE_187 = '/** Valor canónico "Sí" en formularios y Firestore (evita literales corruptos por codificación). */'

PATTERN_CORTESIA = re.compile(
    r"/\* Empleado/cortes[^\n]*?a antes que beca:[^\n]*?\*/",
)
REPL_CORTESIA = (
    "      /* Empleado/cortesía antes que beca: evita bloqueo si beca y asistencia especial "
    "quedan inconsistentes al editar. */"
)


def main() -> int:
    text = TARGET.read_text(encoding="utf-8", errors="replace")
    orig = text

    text, n1 = PATTERN_LINE_187.subn(REPL_LINE_187, text, count=1)
    text, n2 = PATTERN_CORTESIA.subn(REPL_CORTESIA, text, count=1)

    subs = {
        "// Horarios por defecto (24h). ?Segundo? de 11 a 13; ?Tercero? de 13 a 17.": "// Horarios por defecto (24h). «Segundo» de 11 a 13; «Tercero» de 13 a 17.",
        "  /** 'total' | 'partial' ? solo aplica si isScholarship es S? (formulario nuevo registro). */": "  /** 'total' | 'partial' — solo aplica si isScholarship es Sí (formulario nuevo registro). */",
        "  /** Beca parcial: monto cubierto por la beca (cantidad becada); a liquidar = costo de lista actual ? este monto. */": "  /** Beca parcial: monto cubierto por la beca (cantidad becada); a liquidar = costo de lista actual menos este monto. */",
        "/** Colapsar/expandir listas Activos ? Becados (espera) ? Cancelados en registro por sede (por usuario). */": "/** Colapsar/expandir listas Activos / Becados (espera) / Cancelados en registro por sede (por usuario). */",
        "?Sabe nadar?": "¿Sabe nadar?",
        'title="Abrir Men?"': 'title="Abrir Menú"',
        "Opciones: \uFFFDEn qu\uFFFD \uFFFDrea les gustar\uFFFDa servir?": "Opciones: ¿En qué área les gustaría servir?",
        "Configuraci\uFFFDn de Precios": "Configuración de Precios",
        "Categor\uFFFDas de alergias": "Categorías de alergias",
        'title="A\uFFFDadir Sede"': 'title="Añadir Sede"',
        'placeholder="\uFFFDCu\uFFFDl?"': 'placeholder="¿Cuál?"',
        'title="Usa el boton de la barra: Restaurar copia de seguridad"': 'title="Usa el botón de la barra: Restaurar copia de seguridad"',
    }
    for old, new in subs.items():
        text = text.replace(old, new)

    text = text.replace("\r\n", "\n").replace("\r", "\n")

    if text == orig.replace("\r\n", "\n").replace("\r", "\n") and not (n1 or n2):
        print("No changes needed", file=sys.stderr)
        return 1

    TARGET.write_text(text, encoding="utf-8", newline="\n")
    print(f"Updated {TARGET} (regex: line187={n1}, cortesía={n2})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
