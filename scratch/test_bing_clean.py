import urllib.request
import urllib.parse
import re
import os
import ssl
from PIL import Image, ImageFilter, ImageEnhance

ssl._create_default_https_context = ssl._create_unverified_context

headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
}

def search_bing_images_clean(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.bing.com/images/search?q={encoded_query}&asearch=ichips&first=1"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        matches = re.findall(r'(https?://[^\s"()<>]+(?:\.jpg|\.png|\.jpeg))', html, re.IGNORECASE)
        clean_urls = []
        for match in matches:
            decoded = urllib.parse.unquote(match)
            if "murl&quot;:&quot;" in decoded:
                url_part = decoded.split("murl&quot;:&quot;")[-1]
                clean_urls.append(url_part)
            else:
                clean_urls.append(decoded)
        return list(set(clean_urls))
    except Exception as e:
        print(f"Error: {e}")
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
            
        # Smooth skin heavily for digital art look
        smooth = img
        for _ in range(5):
            smooth = smooth.filter(ImageFilter.SMOOTH_MORE)
            
        smooth = ImageEnhance.Color(smooth).enhance(1.4)
        smooth = ImageEnhance.Contrast(smooth).enhance(1.1)
        smooth = ImageEnhance.Sharpness(smooth).enhance(1.2)
        
        # Blend back 30% original photo
        final_img = Image.blend(smooth, img, 0.3)
        
        final_img.save(target_path, "PNG")
        print(f"Digital painting filter applied successfully: {target_path}")
        return True
    except Exception as e:
        print(f"Error applying filter: {e}")
        return False

def test():
    query = "Prabhas face close up photo"
    print(f"Searching mobile Bing for: {query}...")
    urls = search_bing_images_clean(query)
    print(f"Found {len(urls)} cleaned image URLs.")
    
    downloaded = False
    for i, url in enumerate(urls[:20]):
        if "bing.net" in url or "yimg.com" in url:
            continue
        print(f"Attempting download {i+1} from: {url}")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                content = response.read()
                if len(content) > 15000:
                    with open("scratch/temp_prabhas_bing_clean.jpg", "wb") as f:
                        f.write(content)
                    print("Success! Downloaded.")
                    downloaded = True
                    break
        except Exception as e:
            print(f"Failed: {e}")
            
    if downloaded:
        apply_digital_paint_filter("scratch/temp_prabhas_bing_clean.jpg", "scratch/test_movie_prabhas.png")

if __name__ == "__main__":
    test()
