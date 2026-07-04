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
        print(f"Error searching '{query}': {e}")
        return []

def check_oembed(video_id):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return True, data.get('title')
    except urllib.error.HTTPError as e:
        return False, f"HTTP Error {e.code}"
    except Exception as e:
        return False, str(e)

queries = [
    "Telisiney Na Nuvvey Arjun Reddy lyrics",
    "Telisiney Na Nuvvey Arjun Reddy song",
    "Telisene Na Nuvve lyrics"
]

found = False
for q in queries:
    print(f"Searching: '{q}'...")
    vids = search_youtube(q)
    for vid in vids[:5]:
        ok, title = check_oembed(vid)
        if ok:
            print(f"FOUND SUCCESS: {vid} ({title})")
            found = True
            break
    if found:
        break
