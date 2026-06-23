with open('js/multiplayer.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if 'myUid' in line or '.uid' in line:
        print(f"{i}: {line.strip()}")
