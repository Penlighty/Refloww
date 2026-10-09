import re, glob

def check_pattern(pattern, files, name):
    regex = re.compile(pattern)
    matches = []
    for f in files:
        if 'src/components/icons/' in f.replace('\\', '/'):
            continue
        try:
            content = open(f, encoding='utf-8').read()
            for line_no, line in enumerate(content.splitlines(), 1):
                if regex.search(line):
                    matches.append((f, line_no, line.strip()))
        except Exception:
            pass
    print(f"[{name}] matches count: {len(matches)}")
    if matches and len(matches) <= 10:
        for m in matches:
            print(f"  {m[0]}:{m[1]} -> {m[2][:80]}")
    return len(matches)

files = glob.glob('src/**/*.ts*', recursive=True) + glob.glob('src/**/*.css', recursive=True)

print("=== GATES VERIFICATION ===")
c1 = check_pattern(r'lucide-react|react-icons', files, "Lucide / React-Icons Imports")
c2 = check_pattern(r'\bh-screen\b|\bmin-h-screen\b|\b100vh\b', files, "Legacy 100vh / h-screen units")
c3 = check_pattern(r'max-h-\[\d+vh\]', files, "Legacy max-h-[Nvh]")
c4 = check_pattern(r'window\.innerWidth', files, "Raw window.innerWidth calls")
print("=== END GATES ===")
