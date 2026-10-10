import re, sys, collections
"""Usage: python tests/analyze_log.py out.txt   (out.txt from tests/logdump.mjs)
Group captured log lines by template signature and report what dominates."""
import io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

path = sys.argv[1]
lines = [l.rstrip('\n').split('\t', 1) for l in open(path, encoding='utf-8') if '\t' in l]
rows = [(int(k), t) for k, t in lines]
print('lines:', len(rows), 'ticks:', rows[-1][0] - rows[0][0] if rows else 0)

# Town and person names are capitalised words; numbers vary. Collapse both.
def sig(t):
    t = re.sub(r"^t\d+\s*", "", t); t = re.sub(r"[^ -~]", "", t).strip()
    s = re.sub(r"\b[A-Z][a-z]+(?:'s)?(?: [A-Z][a-z]+(?:'s)?)*", 'X', t)
    s = re.sub(r'\d+', 'N', s)
    s = re.sub(r'\b(before dawn|at first light|in the morning|at midday|in the afternoon|toward evening|at dusk|in the night)\b', 'DAY', s)
    s = re.sub(r'\b(in the rain|in the storm|in the dust of the drought|with snow coming down|with the wind up|under a hot sky|in the cold|under a clear sky)\b', 'WX', s)
    return s[:110]

c = collections.Counter(sig(t) for _, t in rows)
print('\ndistinct signatures:', len(c))
print('\n=== top 60 signatures ===')
for s, n in c.most_common(60):
    print(f'{n:5d}  {s}')

# Streaks: same signature within 8 consecutive lines.
print('\n=== worst back-to-back repeats (same signature within 8 lines) ===')
rep = collections.Counter()
sigs = [sig(t) for _, t in rows]
for i, s in enumerate(sigs):
    if s in sigs[max(0, i - 8):i]:
        rep[s] += 1
for s, n in rep.most_common(25):
    print(f'{n:5d}  {s}')

# Per-year share: how many distinct signatures per 2400 ticks
print('\n=== distinct signatures per year ===')
by = collections.defaultdict(set); tot = collections.Counter()
for k, t in rows:
    by[k // 2400].add(sig(t)); tot[k // 2400] += 1
for y in sorted(by):
    print(f'year {y}: {tot[y]} lines, {len(by[y])} distinct')
