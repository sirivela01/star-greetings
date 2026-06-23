from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageChops
import os

def cartoonize_image(source_path, target_path):
    try:
        img = Image.open(source_path)
        
        # 1. Square Crop and Resize
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        img = img.crop((left, top, left + min_dim, top + min_dim))
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        if img.mode == 'RGBA':
            img = img.convert('RGB')
            
        # 2. Generate Outlines (Line Art)
        gray = ImageOps.grayscale(img)
        # Smooth gray slightly to remove high-frequency noise
        gray = gray.filter(ImageFilter.GaussianBlur(1.0))
        edges = gray.filter(ImageFilter.FIND_EDGES)
        edges = ImageOps.invert(edges)
        
        # Make lines bolder and clean
        edges = ImageEnhance.Contrast(edges).enhance(4.0)
        edges = edges.point(lambda p: 255 if p > 160 else 0)
        # Smooth outlines slightly
        edges = edges.filter(ImageFilter.GaussianBlur(0.5))
        
        # 3. Generate Smoothed Colors (Cel Shading / Painting Look)
        color = img
        for _ in range(6):
            color = color.filter(ImageFilter.SMOOTH_MORE)
        
        # Enhance color vibrancy
        color = ImageEnhance.Color(color).enhance(1.5)
        color = ImageEnhance.Contrast(color).enhance(1.1)
        
        # 4. Multiply Outlines on top of Smoothed Colors
        cartoon = ImageChops.multiply(color, edges.convert('RGB'))
        
        # 5. Blend slightly with original to retain exact face details
        original = Image.open(source_path).crop((left, top, left + min_dim, top + min_dim)).resize((512, 512), Image.Resampling.LANCZOS)
        final_img = Image.blend(cartoon, original, 0.25) # 25% original detail, 75% cartoon
        
        # Save as PNG
        final_img.save(target_path, "PNG")
        print(f"Successfully cartoonized {source_path} -> {target_path}")
        return True
    except Exception as e:
        print(f"Error cartoonizing: {e}")
        return False

def test():
    source = "assets/real_stars/prabhas.jpg"
    target = "scratch/test_cartoon_prabhas.png"
    if os.path.exists(source):
        cartoonize_image(source, target)
    else:
        print(f"Source file {source} not found.")

if __name__ == "__main__":
    test()
