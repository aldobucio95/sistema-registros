from pathlib import Path
p = Path("src/App.jsx")
lines = p.read_text(encoding="utf-8").splitlines()
# Find modal form start (0-based)
start = next(i for i, l in enumerate(lines) if '<form onSubmit={handleUpdateEntry} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">' in l)
# Find matching </form> at same indent (12 spaces) after start
end = None
for i in range(start + 1, len(lines)):
    if lines[i].strip() == "</form>" and lines[i].startswith("            "):
        end = i
        break
if end is None:
    raise SystemExit("end form not found")
replacement = [
    '            <form onSubmit={handleUpdateEntry} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">',
    '              {renderEditRegistryModalFormFields({ onCancel: resetEditRegistryModal })}',
    '            </form>',
]
new_lines = lines[:start] + replacement + lines[end + 1 :]
p.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
print("removed lines", start, end, "count", end - start + 1)
