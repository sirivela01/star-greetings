import urllib.request
import urllib.parse
import json
import ssl

# Disable SSL verification to prevent "CERTIFICATE_VERIFY_FAILED" error
ssl._create_default_https_context = ssl._create_unverified_context

def test():
    name = "Prabhas"
    encoded_name = urllib.parse.quote(name)
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_name}&prop=pageimages&format=json&pithumbsize=1000&redirects=1"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if "thumbnail" in page_data:
                source = page_data["thumbnail"]["source"]
                print(f"Success! Image URL: {source}")
                return source
        print("No image found for page.")
    except Exception as e:
        print(f"Error: {e}")
    return None

if __name__ == "__main__":
    test()
