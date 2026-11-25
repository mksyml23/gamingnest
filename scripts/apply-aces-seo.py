"""Update metadata in the assembled ACES release without touching game code."""
from pathlib import Path

path = Path(__file__).resolve().parent.parent / "soepgames/games/aces.html"
old = "A precision psychological platformer and behavioral profiler by GamingNest."
new = "Play ACES, a precision platformer that tracks your choices and playstyle. Navigate challenging levels in your browser for free."
text = path.read_text(encoding="utf-8")
if text.count(old) != 2:
    raise RuntimeError("Unexpected ACES release metadata; no changes made")
path.write_text(text.replace(old, new), encoding="utf-8")
print("Updated ACES description and social description")
