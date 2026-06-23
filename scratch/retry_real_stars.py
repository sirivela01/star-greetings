import os
import urllib.request
import urllib.parse
import json
import ssl
import time

ssl._create_default_https_context = ssl._create_unverified_context

stars = [
    {"id": "rashmika", "name": "Rashmika Mandanna", "wiki": "Rashmika Mandanna"},
    {"id": "nani", "name": "Nani", "wiki": "Nani (actor)"},
    {"id": "keerthy_suresh", "name": "Keerthy Suresh", "wiki": "Keerthy Suresh"},
    {"id": "ranbir_kapoor", "name": "Ranbir Kapoor", "wiki": "Ranbir Kapoor"},
    {"id": "ranveer_singh", "name": "Ranveer Singh", "wiki": "Ranveer Singh"},
    {"id": "alia_bhatt", "name": "Alia Bhatt", "wiki": "Alia Bhatt"},
    {"id": "deepika_padukone", "name": "Deepika Padukone", "wiki": "Deepika Padukone"},
    {"id": "katrina_kaif", "name": "Katrina Kaif", "wiki": "Katrina Kaif"},
    {"id": "hrithik_roshan", "name": "Hrithik Roshan", "wiki": "Hrithik Roshan"},
    {"id": "priyanka_chopra", "name": "Priyanka Chopra", "wiki": "Priyanka Chopra"}
]

output_dir = "assets/real_stars"
headers = {
    # Custom User-Agent as required by Wikimedia policies
    'User-Agent': 'StarGreetingsGameApp/1.2 (contact@stargreetingsgame.com) Python-urllib/3.10'
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

print("Retrying download for failed real star photos with polite rate-limiting...")
for star in stars:
    file_path = os.path.join(output_dir, f"{star['id']}.jpg")
    
    # Skip if already exists with good size
    if os.path.exists(file_path) and os.path.getsize(file_path) > 10000:
        print(f"{star['name']} photo already exists, skipping.")
        continue
        
    print(f"\nProcessing {star['name']}...")
    success = False
    
    # 5 attempts with a 5 second sleep in between
    for attempt in range(1, 6):
        print(f"Attempt {attempt}/5: Querying Wikipedia for {star['name']}...")
        wiki_img_url = get_wikipedia_image(star['wiki'])
        if wiki_img_url:
            print(f"Found photo URL: {wiki_img_url}")
            try:
                req = urllib.request.Request(wiki_img_url, headers=headers)
                with urllib.request.urlopen(req) as response:
                    content = response.read()
                    if len(content) > 10000:
                        with open(file_path, "wb") as f:
                            f.write(content)
                        print(f"Successfully downloaded photo for {star['name']}.")
                        success = True
                        break
            except Exception as e:
                print(f"Download failed: {e}")
        else:
            print(f"No Wikipedia photo URL returned.")
            
        # Wait before retrying this star
        time.sleep(4.0)
        
    if not success:
        print(f"CRITICAL WARNING: Failed to download {star['name']} after 5 attempts.")
        
    # Polite sleep between stars
    time.sleep(5.0)

print("\nFinished retry downloads.")
