from pathlib import Path
p = Path("src/_extracted_form.txt")
t = p.read_text(encoding="utf-8")
old = """<button type="button" onClick={() => { setEditRegistryModal({ isOpen: false, loc: '', data: null }); setEditPreferredServeDropdownOpen(false); setEditServedAreasDropdownOpen(false); }} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm uppercase">Cancelar</button>"""
new = '<button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm uppercase">Cancelar</button>'
if old not in t:
    raise SystemExit("OLD NOT FOUND")
p.write_text(t.replace(old, new), encoding="utf-8")
print("ok")
