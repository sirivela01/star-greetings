import urllib.request
import urllib.parse
import re
import os

def search_yahoo_images(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://images.search.yahoo.com/search/images?p={encoded_query}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        # Extract image URLs from the HTML. Yahoo images contains structured JSON or img tags.
        # Let's search for "imgurl":"(.*?)" or similar patterns
        image_urls = re.findall(r'"imgurl":"(.*?)"', html)
        if not image_urls:
            # Fallback pattern
            image_urls = re.findall(r'src="(http.*?)"', html)
            
        # Clean escaped slashes
        image_urls = [url.replace('\\/', '/') for url in image_urls]
        return image_urls
    except Exception as e:
        print(f"Error searching Yahoo images: {e}")
        return []

def test():
    query = "Prabhas anime digital art portrait"
    print(f"Searching for: {query}...")
    urls = search_yahoo_images(query)
    print(f"Found {len(urls)} images.")
    for i, url in enumerate(urls[:5]):
        print(f"{i+1}: {url}")
        
    if urls:
        target_url = urls[0]
        # Skip small icons/placeholders if possible, find one that looks like a full image
        for url in urls:
            if "yimg.com" not in url and (url.endswith(".jpg") or url.endswith(".png") or url.endswith(".jpeg")):
                target_url = url
                break
        print(f"Downloading from: {target_url}")
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            req = urllib.request.Request(target_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                with open("scratch/test_scraped_prabhas.jpg", "wb") as f:
                    f.write(response.read())
            print("Successfully downloaded scraped image!")
        except Exception as e:
            print(f"Failed to download image: {e}")

if __name__ == "__main__":
    test()
