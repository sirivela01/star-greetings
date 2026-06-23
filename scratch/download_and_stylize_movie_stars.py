import urllib.request
import urllib.parse
import re
import os
import ssl
import time
from PIL import Image, ImageFilter, ImageEnhance

# Disable SSL verification to prevent certificate errors
ssl._create_default_https_context = ssl._create_unverified_context

star_queries = {
    "prabhas": "Prabhas white shirt portrait movie still close up",
    "mahesh_babu": "Mahesh Babu close up face portrait movie still",
    "allu_arjun": "Allu Arjun Pushpa close up face portrait movie still",
    "jr_ntr": "Jr NTR RRR close up face portrait movie still",
    "ram_charan": "Ram Charan RRR close up face portrait movie still",
    "samantha": "Samantha Ruth Prabhu close up face portrait movie still",
    "rashmika": "Rashmika Mandanna Srivalli close up face portrait movie still",
    "pooja_hegde": "Pooja Hegde close up face portrait movie still",
    "nani": "Nani actor close up face portrait movie still",
    "vijay_deverakonda": "Vijay Deverakonda Arjun Reddy close up face portrait movie still",
    "keerthy_suresh": "Keerthy Suresh Mahanati close up face portrait movie still",
    "anushka_shetty": "Anushka Shetty Devasena close up face portrait movie still",
    "kajal_aggarwal": "Kajal Aggarwal Magadheera close up face portrait movie still",
    "sai_pallavi": "Sai Pallavi close up face portrait movie still",
    "shruti_haasan": "Shruti Haasan close up face portrait movie still",
    "ranbir_kapoor": "Ranbir Kapoor Animal close up face portrait movie still",
    "ranveer_singh": "Ranveer Singh Bajirao close up face portrait movie still",
    "alia_bhatt": "Alia Bhatt Gangubai close up face portrait movie still",
    "deepika_padukone": "Deepika Padukone Padmaavat close up face portrait movie still",
    "vicky_kaushal": "Vicky Kaushal Uri close up face portrait movie still",
    "kiara_advani": "Kiara Advani close up face portrait movie still",
    "shah_rukh_khan": "Shah Rukh Khan close up face portrait movie still",
    "katrina_kaif": "Katrina Kaif close up face portrait movie still",
    "hrithik_roshan": "Hrithik Roshan War close up face portrait movie still",
    "priyanka_chopra": "Priyanka Chopra close up face portrait movie still",
    "kareena_kapoor": "Kareena Kapoor Geet close up face portrait movie still",
    "ayushmann_khurrana": "Ayushmann Khurrana close up face portrait movie still",
    "shraddha_kapoor": "Shraddha Kapoor close up face portrait movie still",
    "rajkummar_rao": "Rajkummar Rao close up face portrait movie still",
    "kriti_sanon": "Kriti Sanon close up face portrait movie still"
}

output_dir = "assets/stars"
os.makedirs(output_dir, exist_ok=True)

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
        print(f"Error searching Bing: {e}")
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
        
        # Convert any format (RGBA, Palette, Grayscale) to RGB to prevent palette errors
        if img.mode != 'RGB':
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

print("Starting generation of 100% identical movie star portraits...")
for star_id, query in star_queries.items():
    file_path = os.path.join(output_dir, f"{star_id}.png")
    print(f"\nProcessing {star_id}...")
    
    # 2. Search Bing Images
    urls = search_bing_images_clean(query)
    
    # 3. Try downloading first successful direct link
    downloaded = False
    temp_source = f"scratch/temp_{star_id}.jpg"
    for i, url in enumerate(urls[:15]):
        if "bing.net" in url or "yimg.com" in url:
            continue
            
        # Safely clean and print URL to prevent Windows console encoding errors
        safe_url = url.encode('ascii', 'ignore').decode('ascii')
        print(f"Attempting download {i+1} from: {safe_url[:80]}...")
        
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read()
                if len(content) > 15000:
                    with open(temp_source, "wb") as f:
                        f.write(content)
                    print(f"Success! Downloaded photo for {star_id}.")
                    downloaded = True
                    break
        except Exception as e:
            print(f"Failed: {e}")
            
    # 4. Apply stylized digital paint filter
    if downloaded:
        success = apply_digital_paint_filter(temp_source, file_path)
        if not success:
            print(f"Failed to stylize {star_id}")
        # Clean up temp file
        try:
            os.remove(temp_source)
        except:
            pass
    else:
        print(f"WARNING: Could not download movie photo for {star_id}")
        
    # Polite sleep between stars
    time.sleep(2.0)

print("\nFinished generation of all movie star portraits.")
