import urllib.request
import urllib.parse
import re
import os
import ssl
from PIL import Image, ImageFilter, ImageEnhance

# Disable SSL verification
ssl._create_default_https_context = ssl._create_unverified_context

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def search_ddg_images(query):
    encoded_query = urllib.parse.quote(query)
    # DuckDuckGo HTML search URL
    url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        # Parse standard DuckDuckGo search result links to find image files or sources
        # We search for href links that look like image search or contain image formats
        links = re.findall(r'href="(http[^"]+)"', html)
        img_links = []
        for link in links:
            # Decode URL
            decoded = urllib.parse.unquote(link)
            # Find URLs pointing directly to images
            matches = re.findall(r'(http[s]?://[^\s()<>]+(?:\.jpg|\.png|\.jpeg))', decoded, re.IGNORECASE)
            img_links.extend(matches)
        return list(set(img_links))
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return []

def apply_digital_paint_filter(source_path, target_path):
    try:
        img = Image.open(source_path)
        
        # Center crop to square
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        img = img.crop((left, top, left + min_dim, top + min_dim))
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        
        if img.mode == 'RGBA':
            img = img.convert('RGB')
            
        # 1. Smooth the skin and backgrounds to get a digital art look
        # Multiple passes of SMOOTH_MORE creates a soft airbrushed painting effect
        smooth = img
        for _ in range(4):
            smooth = smooth.filter(ImageFilter.SMOOTH_MORE)
            
        # 2. Boost color saturation slightly to make it look vibrant
        smooth = ImageEnhance.Color(smooth).enhance(1.25)
        
        # 3. Enhance contrast to make details stand out
        smooth = ImageEnhance.Contrast(smooth).enhance(1.1)
        
        # 4. Enhance sharpness slightly to make eyes and features crisp
        smooth = ImageEnhance.Sharpness(smooth).enhance(1.15)
        
        # 5. Blend back with 30% of the original photo to retain perfect likeness and realism
        final_img = Image.blend(smooth, img, 0.3)
        
        final_img.save(target_path, "PNG")
        print(f"Digital painting filter applied successfully: {target_path}")
        return True
    except Exception as e:
        print(f"Error applying filter: {e}")
        return False

def test():
    query = "Prabhas in white shirt from movie close up portrait photo"
    print(f"Searching DuckDuckGo for: {query}...")
    urls = search_ddg_images(query)
    print(f"Found {len(urls)} direct image links.")
    for i, url in enumerate(urls[:5]):
        print(f"{i+1}: {url}")
        
    if urls:
        # Choose the first URL
        target_url = urls[0]
        # Download
        temp_source = "scratch/temp_prabhas_movie.jpg"
        print(f"Downloading from: {target_url}...")
        try:
            req = urllib.request.Request(target_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                content = response.read()
                with open(temp_source, "wb") as f:
                    f.write(content)
            print("Download successful. Applying digital painting filter...")
            apply_digital_paint_filter(temp_source, "scratch/test_movie_prabhas.png")
        except Exception as e:
            print(f"Error downloading: {e}")

if __name__ == "__main__":
    test()
