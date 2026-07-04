import urllib.request
import urllib.parse
import re

def search_youtube(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            # Extract video IDs: watch?v=...
            video_ids = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
            # Remove duplicates while preserving order
            seen = set()
            unique_ids = []
            for vid in video_ids:
                if vid not in seen:
                    seen.add(vid)
                    unique_ids.append(vid)
            return unique_ids
    except Exception as e:
        print(f"Error searching for '{query}': {e}")
        return []

ids = search_youtube("Srivalli Telugu lyrics")
print("Found video IDs:", ids)
