import urllib.request
import json

ids = {
    "allu_arjun": "09gyurxkX6A",
    "ram_charan": "bO9Y3ArFnYA"
}

for name, vid in ids.items():
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            title = data.get('title')
            print(f"{name}: {title.encode('ascii', errors='ignore').decode('ascii')}")
    except Exception as e:
        print(f"Error {name}: {e}")
