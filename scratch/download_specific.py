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
    url = "https://wallpapers.com/images/hd/prabhas-hd-in-white-button-up-shirt-nh5k3prxjl6g5dr7.jpg"
    print(f"Downloading from: {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read()
            with open("scratch/temp_prabhas_exact.jpg", "wb") as f:
                f.write(content)
        print("Success! Downloaded.")
        apply_digital_paint_filter("scratch/temp_prabhas_exact.jpg", "scratch/test_exact_prabhas.png")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
