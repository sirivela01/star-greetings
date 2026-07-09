import requests
response = requests.get("https://star-greetings.onrender.com/index.html")
html = response.text
lines = html.split("\n")
# Find the line indices with select-star-greetings-btn
for idx, line in enumerate(lines):
    if "select-star-greetings-btn" in line or "select-barakatta-btn" in line:
        print(f"--- Line {idx} ---")
        for i in range(max(0, idx-5), min(len(lines), idx+10)):
            print(f"{i}: {lines[i]}")
