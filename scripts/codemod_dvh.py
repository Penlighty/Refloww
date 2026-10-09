import re, glob

pairs = [
    (r'\bh-screen\b', 'h-dvh'),
    (r'\bmin-h-screen\b', 'min-h-dvh'),
    (r'\bmax-h-screen\b', 'max-h-dvh'),
    (r'\b((?:max-|min-)?h-)\[(\d+)vh\]', r'\1[\2dvh]'),
    (r'calc\(100vh', 'calc(100dvh')
]

count = 0
for f in glob.glob('src/**/*.[tc]ss*', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    s = open(f, encoding='utf-8').read()
    t = s
    for a, b in pairs:
        t = re.sub(a, b, t)
    t = re.sub(r"(['\"])(\d+)vh\1", r"\1\2dvh\1", t)
    if t != s:
        open(f, 'w', encoding='utf-8').write(t)
        count += 1
        print('Updated dvh:', f)
print('Total files updated for dvh:', count)
