import urllib.request
import urllib.parse
import json
import re
import urllib.error

def search_youtube(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            video_ids = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
            seen = set()
            unique_ids = []
            for vid in video_ids:
                if vid not in seen:
                    seen.add(vid)
                    unique_ids.append(vid)
            return unique_ids
    except Exception as e:
        return []

def check_oembed(video_id):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return True, data.get('title')
    except Exception as e:
        return False, str(e)

# 1. Search for Pushpa Thaggede Le dialogue
allu_vids = search_youtube("Pushpa Raj Thaggede le dialogue telugu")
allu_id = None
for vid in allu_vids[:5]:
    ok, title = check_oembed(vid)
    if ok:
        allu_id = vid
        break

# 2. Search for Peddi dialogue
ram_vids = search_youtube("Peddi dialogue Ram Charan Telugu")
ram_id = None
for vid in ram_vids[:5]:
    ok, title = check_oembed(vid)
    if ok:
        ram_id = vid
        break

results = {
    "allu_arjun": allu_id,
    "ram_charan": ram_id
}

with open("scratch/dialogues.json", "w") as f:
    json.dump(results, f, indent=2)

print("Saved results to scratch/dialogues.json")
