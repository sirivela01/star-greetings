from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import os

def stylize_image(source_path, target_path):
    try:
        # Load real photo
        img = Image.open(source_path)
        
        # 1. Centered crop to square (512x512)
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = (width + min_dim) / 2
        bottom = (height + min_dim) / 2
        
        img = img.crop((left, top, right, bottom))
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        
        # 2. Convert to RGB if it's RGBA
        if img.mode == 'RGBA':
            img = img.convert('RGB')
            
        # 3. Enhance Saturation to make it vibrant/artistic
        converter = ImageEnhance.Color(img)
        img = converter.enhance(1.3) # Boost colors
        
        # 4. Enhance Contrast
        converter = ImageEnhance.Contrast(img)
        img = converter.enhance(1.1)
        
        # 5. Apply smooth filter to give it a painterly/brushed look
        # Applying SMOOTH_MORE multiple times gives a soft digital art effect
        for _ in range(3):
            img = img.filter(ImageFilter.SMOOTH_MORE)
            
        # 6. Apply Detail filter to bring back key facial features
        img = img.filter(ImageFilter.DETAIL)
        
        # 7. Apply a subtle edge enhancement to get clean outlines (like cartoon/anime)
        img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        
        # 8. Blend with original image slightly to keep 100% likeness
        original = Image.open(source_path).crop((left, top, right, bottom)).resize((512, 512), Image.Resampling.LANCZOS)
        img = Image.blend(img, original, 0.4) # 40% original, 60% stylized painting
        
        # Save as PNG
        img.save(target_path, "PNG")
        print(f"Successfully stylized {source_path} -> {target_path}")
        return True
    except Exception as e:
        print(f"Error stylizing image: {e}")
        return False

def test():
    source = "assets/real_stars/prabhas.jpg"
    target = "scratch/test_stylized_prabhas.png"
    if os.path.exists(source):
        stylize_image(source, target)
    else:
        print(f"Source file {source} not found.")

if __name__ == "__main__":
    test()
