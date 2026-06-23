with open("js/ui-rendering.js", "r", encoding="utf-8") as f:
    for line_no, line in enumerate(f, 1):
        if ".png" in line or "stars/" in line:
            print(f"{line_no}: {line.strip()}")
