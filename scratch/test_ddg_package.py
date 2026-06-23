import os
import sys

# Auto-install duckduckgo_search if not present
try:
    from duckduckgo_search import DDGS
except ImportError:
    print("Installing duckduckgo_search...")
    os.system(f'"{sys.executable}" -m pip install duckduckgo_search')
    from duckduckgo_search import DDGS

import urllib.request
import ssl
from PIL import Image, ImageFilter, ImageEnhance

ssl._create_default_https_context = ssl._create_unverified_context

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

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
            
        # Smooth the skin and backgrounds to get a digital art look
        smooth = img
        for _ in range(4):
            smooth = smooth.filter(ImageFilter.SMOOTH_MORE)
            
        smooth = ImageEnhance.Color(smooth).enhance(1.3)
        smooth = ImageEnhance.Contrast(smooth).enhance(1.1)
        smooth = ImageEnhance.Sharpness(smooth).enhance(1.15)
        
        # Blend back with 30% of the original photo to retain perfect likeness and realism
        final_img = Image.blend(smooth, img, 0.3)
        
        final_img.save(target_path, "PNG")
        print(f"Digital painting filter applied successfully: {target_path}")
        return True
    except Exception as e:
        print(f"Error applying filter: {e}")
        return False

def test():
    query = "Prabhas white shirt portrait movie still"
    print(f"Searching DuckDuckGo Images for: '{query}'...")
    try:
        with DDGS() as ddgs:
            # search images
            results = list(ddgs.images(query, max_results=5))
            
        if results:
            print(f"Found {len(results)} image results.")
            for i, r in enumerate(results):
                print(f"{i+1}: {r['image']}")
                
            target_url = results[0]['image']
            temp_source = "scratch/temp_prabhas_movie.jpg"
            print(f"Downloading from: {target_url}...")
            
            req = urllib.request.Request(target_url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read()
                with open(temp_source, "wb") as f:
                    f.write(content)
            print("Download successful. Stylizing...")
            apply_digital_paint_filter(temp_source, "scratch/test_movie_prabhas.png")
        else:
            print("No image results found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
