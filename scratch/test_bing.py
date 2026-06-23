import urllib.request
import urllib.parse
import re
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
}

def search_bing_images_mobile(query):
    encoded_query = urllib.parse.quote(query)
    # Simple mobile search URL
    url = f"https://www.bing.com/images/search?q={encoded_query}&asearch=ichips&first=1"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        # Parse image URLs. Mobile html usually has direct img tags or links
        # Search for all links ending with .jpg or .png or .jpeg
        image_urls = re.findall(r'(https?://[^\s"()<>]+(?:\.jpg|\.png|\.jpeg))', html, re.IGNORECASE)
        # Clean double slashes
        image_urls = [url.replace('\\/', '/') for url in image_urls]
        return list(set(image_urls))
    except Exception as e:
        print(f"Error: {e}")
        return []

def test():
    query = "Prabhas white shirt movie still portrait close up"
    print(f"Searching mobile Bing for: {query}...")
    urls = search_bing_images_mobile(query)
    print(f"Found {len(urls)} image URLs.")
    for i, url in enumerate(urls[:10]):
        print(f"{i+1}: {url}")
        
    if urls:
        # Download the first one
        target_url = urls[0]
        # Choose a clean one
        for url in urls:
            if "bing.net" not in url and "yimg.com" not in url:
                target_url = url
                break
        print(f"Downloading from: {target_url}")
        try:
            req = urllib.request.Request(target_url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read()
                with open("scratch/temp_prabhas_bing.jpg", "wb") as f:
                    f.write(content)
            print("Success! Downloaded.")
        except Exception as e:
            print(f"Failed to download: {e}")

if __name__ == "__main__":
    test()
