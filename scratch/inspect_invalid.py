import urllib.request
import urllib.error

url = "https://www.youtube.com/embed/n45s2sVd4z0"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as r:
        html = r.read().decode('utf-8')
        print(f"Length of HTML: {len(html)}")
        # Print first 500 chars and search for some keywords
        print(html[:1000])
        print("---")
        for word in ["playabilityStatus", "UNPLAYABLE", "ERROR", "Video unavailable", "Watch on YouTube", "embeddable"]:
            print(f"Contains '{word}': {word in html}")
except Exception as e:
    print("Error:", e)
