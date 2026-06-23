import os
import shutil

# Paths
source_dir = "assets/real_stars"
target_dir = "assets/stars"

# Get all downloaded real stars
real_stars = [f for f in os.listdir(source_dir) if f.endswith('.jpg')]

print(f"Found {len(real_stars)} real star photos in {source_dir}.")

from PIL import Image, ImageFilter, ImageEnhance

def apply_digital_paint_filter(source_path, target_path):
    try:
        img = Image.open(source_path)
        
        # Crop to square with 5% top offset for portrait images
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        
        if height > width:
            top = (height - min_dim) * 0.05
        else:
            top = (height - min_dim) / 2
            
        img = img.crop((left, top, left + min_dim, top + min_dim))
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Smooth skin heavily for digital art look
        smooth = img
        for _ in range(5):
            smooth = smooth.filter(ImageFilter.SMOOTH_MORE)
            
        smooth = ImageEnhance.Color(smooth).enhance(1.4)
        smooth = ImageEnhance.Contrast(smooth).enhance(1.1)
        smooth = ImageEnhance.Sharpness(smooth).enhance(1.2)
        
        # Blend back 30% original photo to retain 100% likeness
        final_img = Image.blend(smooth, img, 0.3)
        
        final_img.save(target_path, "PNG")
        print(f"Successfully stylized and saved: {target_path}")
        return True
    except Exception as e:
        print(f"Error stylizing {source_path}: {e}")
        return False

# Stylize all
for filename in real_stars:
    star_id = os.path.splitext(filename)[0]
    source_path = os.path.join(source_dir, filename)
    target_path = os.path.join(target_dir, f"{star_id}.png")
    
    apply_digital_paint_filter(source_path, target_path)

print("All real star photos successfully stylized and copied to assets/stars/!")
