import os
import urllib.request
import urllib.parse
import json
import ssl
import re
import time

# Disable SSL verification to prevent certificate errors
ssl._create_default_https_context = ssl._create_unverified_context

stars = [
    {"id": "prabhas", "name": "Prabhas", "wiki": "Prabhas"},
    {"id": "mahesh_babu", "name": "Mahesh Babu", "wiki": "Mahesh Babu"},
    {"id": "allu_arjun", "name": "Allu Arjun", "wiki": "Allu Arjun"},
    {"id": "jr_ntr", "name": "Jr NTR", "wiki": "N. T. Rama Rao Jr."},
    {"id": "ram_charan", "name": "Ram Charan", "wiki": "Ram Charan"},
    {"id": "samantha", "name": "Samantha Ruth Prabhu", "wiki": "Samantha Ruth Prabhu"},
    {"id": "rashmika", "name": "Rashmika Mandanna", "wiki": "Rashmika Mandanna"},
    {"id": "pooja_hegde", "name": "Pooja Hegde", "wiki": "Pooja Hegde"},
    {"id": "nani", "name": "Nani", "wiki": "Nani (actor)"},
    {"id": "vijay_deverakonda", "name": "Vijay Deverakonda", "wiki": "Vijay Deverakonda"},
    {"id": "keerthy_suresh", "name": "Keerthy Suresh", "wiki": "Keerthy Suresh"},
    {"id": "anushka_shetty", "name": "Anushka Shetty", "wiki": "Anushka Shetty"},
    {"id": "kajal_aggarwal", "name": "Kajal Aggarwal", "wiki": "Kajal Aggarwal"},
    {"id": "sai_pallavi", "name": "Sai Pallavi", "wiki": "Sai Pallavi"},
    {"id": "shruti_haasan", "name": "Shruti Haasan", "wiki": "Shruti Haasan"},
    {"id": "ranbir_kapoor", "name": "Ranbir Kapoor", "wiki": "Ranbir Kapoor"},
    {"id": "ranveer_singh", "name": "Ranveer Singh", "wiki": "Ranveer Singh"},
    {"id": "alia_bhatt", "name": "Alia Bhatt", "wiki": "Alia Bhatt"},
    {"id": "deepika_padukone", "name": "Deepika Padukone", "wiki": "Deepika Padukone"},
    {"id": "vicky_kaushal", "name": "Vicky Kaushal", "wiki": "Vicky Kaushal"},
    {"id": "kiara_advani", "name": "Kiara Advani", "wiki": "Kiara Advani"},
    {"id": "shah_rukh_khan", "name": "Shah Rukh Khan", "wiki": "Shah Rukh Khan"},
    {"id": "katrina_kaif", "name": "Katrina Kaif", "wiki": "Katrina Kaif"},
    {"id": "hrithik_roshan", "name": "Hrithik Roshan", "wiki": "Hrithik Roshan"},
    {"id": "priyanka_chopra", "name": "Priyanka Chopra", "wiki": "Priyanka Chopra"},
    {"id": "kareena_kapoor", "name": "Kareena Kapoor", "wiki": "Kareena Kapoor Khan"},
    {"id": "ayushmann_khurrana", "name": "Ayushmann Khurrana", "wiki": "Ayushmann Khurrana"},
    {"id": "shraddha_kapoor", "name": "Shraddha Kapoor", "wiki": "Shraddha Kapoor"},
    {"id": "rajkummar_rao", "name": "Rajkummar Rao", "wiki": "Rajkummar Rao"},
    {"id": "kriti_sanon", "name": "Kriti Sanon", "wiki": "Kriti Sanon"}
]

output_dir = "assets/real_stars"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def get_wikipedia_image(wiki_title):
    encoded_title = urllib.parse.quote(wiki_title)
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_title}&prop=pageimages&format=json&pithumbsize=1000&redirects=1"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if "thumbnail" in page_data:
                return page_data["thumbnail"]["source"]
    except Exception as e:
        print(f"Wikipedia API error for {wiki_title}: {e}")
    return None

def search_yahoo_images(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://images.search.yahoo.com/search/images?p={encoded_query}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
        image_urls = re.findall(r'"imgurl":"(.*?)"', html)
        if not image_urls:
            image_urls = re.findall(r'src="(http.*?)"', html)
        image_urls = [url.replace('\\/', '/') for url in image_urls]
        return image_urls
    except Exception as e:
        print(f"Yahoo search error: {e}")
        return []

print("Starting download of real star photos...")
for star in stars:
    file_path = os.path.join(output_dir, f"{star['id']}.jpg")
    
    # Check if already exists with good size
    if os.path.exists(file_path) and os.path.getsize(file_path) > 10000:
        print(f"{star['name']} photo already exists, skipping.")
        continue
        
    print(f"\nProcessing {star['name']}...")
    success = False
    
    # 1. Try Wikipedia API (Primary)
    wiki_img_url = get_wikipedia_image(star['wiki'])
    if wiki_img_url:
        print(f"Found Wikipedia photo: {wiki_img_url}")
        try:
            req = urllib.request.Request(wiki_img_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                content = response.read()
                if len(content) > 10000:
                    with open(file_path, "wb") as f:
                        f.write(content)
                    print(f"Successfully downloaded Wikipedia photo for {star['name']}.")
                    success = True
        except Exception as e:
            print(f"Failed to download Wikipedia photo: {e}")
            
    # 2. Try Yahoo Image Search (Fallback)
    if not success:
        print(f"Wikipedia photo failed. Falling back to Yahoo Search for {star['name']}...")
        query = f"{star['name']} face close up portrait photo"
        urls = search_yahoo_images(query)
        for url in urls:
            if "yimg.com" in url or not (url.endswith(".jpg") or url.endswith(".png") or url.endswith(".jpeg")):
                continue
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req) as response:
                    content = response.read()
                    if len(content) > 10000:
                        with open(file_path, "wb") as f:
                            f.write(content)
                        print(f"Successfully downloaded Yahoo photo for {star['name']}.")
                        success = True
                        break
            except Exception as e:
                pass
                
    if not success:
        print(f"CRITICAL WARNING: Could not retrieve real photo for {star['name']}")
        
    time.sleep(1.0) # rate limiting politeness

print("\nFinished downloading real photos.")
