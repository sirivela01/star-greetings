import os
from PIL import Image

# Paths
source_dir = "assets/real_stars"
artifact_dir = r"C:\Users\syash\.gemini\antigravity\brain\c0e1666e-265e-4c4b-bbcd-483dd363c9fb"

test_stars = ["sai_pallavi.jpg", "kajal_aggarwal.jpg", "alia_bhatt.jpg"]

for filename in test_stars:
    source_path = os.path.join(source_dir, filename)
    if not os.path.exists(source_path):
        print(f"Skipping {filename}: not found")
        continue
        
    img = Image.open(source_path)
    width, height = img.size
    min_dim = min(width, height)
    
    # Try different top offsets: 0.0 (top), 0.1, 0.2, 0.5 (center)
    for offset_factor in [0.0, 0.05, 0.1, 0.15, 0.2, 0.5]:
        left = (width - min_dim) / 2
        # Crop offset
        top = (height - min_dim) * offset_factor
        
        cropped = img.crop((left, top, left + min_dim, top + min_dim))
        cropped = cropped.resize((256, 256), Image.Resampling.LANCZOS)
        
        star_name = os.path.splitext(filename)[0]
        out_name = f"crop_{star_name}_{int(offset_factor*100)}.png"
        out_path = os.path.join(artifact_dir, out_name)
        cropped.save(out_path, "PNG")
        print(f"Saved {out_name}")
