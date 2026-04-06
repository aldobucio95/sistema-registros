# -*- coding: utf-8 -*-
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "App.jsx"

FIXES = {
    187: '/** Valor canónico "Sí" en formularios y Firestore (evita literales corruptos por codificación). */',
    3641: "      /* Empleado/cortesía antes que beca: evita bloqueo si beca y asistencia especial quedan inconsistentes al editar. */",
    12143: '              <Settings2 className="text-indigo-600" /> Configuración de Precios',
    12271: "              <Users className=\"text-amber-600\" /> Opciones: ¿En qué área les gustaría servir?",
    12303: '              <Activity className="text-orange-600" /> Categorías de alergias',
}


def main():
    lines = APP.read_text(encoding="utf-8").splitlines()
    for ln, text in FIXES.items():
        lines[ln - 1] = text
    APP.write_text("\n".join(lines) + "\n", encoding="utf-8")
    t = APP.read_text(encoding="utf-8")
    print("ufffd", t.count("\ufffd"))


if __name__ == "__main__":
    main()
