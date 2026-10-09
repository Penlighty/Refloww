import re, glob

n = 0
for f in glob.glob('src/**/*.ts*', recursive=True):
    norm_f = f.replace('\\', '/')
    if norm_f.startswith('src/components/icons/'):
        continue
    s = open(f, encoding='utf-8').read()
    t = re.sub(r"(from\s*['\"])lucide-react(['\"])", r"\1@/components/icons\2", s)
    if t != s:
        open(f, 'w', encoding='utf-8').write(t)
        n += 1
print('rewrote', n, 'files')
