import os
import urllib.request
import urllib.parse
import time

star_prompts = {
    "prabhas": "Prabhas as Baahubali from the movie Baahubali, wearing royal ancient warrior armor, confident look, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "mahesh_babu": "Mahesh Babu, the handsome Tollywood actor, clean-shaven, in a stylish collared shirt, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "allu_arjun": "Allu Arjun as Pushpa Raj from the movie Pushpa, with thick hair, trendy beard, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "jr_ntr": "Jr NTR from the movie RRR, intense determined eyes, wearing a simple beige kurta, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "ram_charan": "Ram Charan as Alluri Sitarama Raju from the movie RRR, wearing a traditional uniform, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "samantha": "Samantha Ruth Prabhu, the beautiful Tollywood actress, wearing a traditional gorgeous saree, smiling, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "rashmika": "Rashmika Mandanna as Srivalli from the movie Pushpa, cute expression, wearing traditional lehenga, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "pooja_hegde": "Pooja Hegde, the glamorous Tollywood actress, wearing a stunning modern lehenga, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "nani": "Nani, the natural actor, wearing a casual checkered shirt, smiling warmly, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "vijay_deverakonda": "Vijay Deverakonda as Arjun Reddy, with wavy dark hair, full beard, wearing sunglasses and black shirt, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "keerthy_suresh": "Keerthy Suresh as Savitri from the movie Mahanati, traditional retro style, traditional silk saree, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "anushka_shetty": "Anushka Shetty as Devasena from the movie Baahubali, beautiful queen, wearing blue saree, jewelry, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "kajal_aggarwal": "Kajal Aggarwal as Mitravinda from the movie Magadheera, beautiful princess wearing traditional lehenga, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "sai_pallavi": "Sai Pallavi, the beautiful actress, simple elegant saree, long curly hair, smiling, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "shruti_haasan": "Shruti Haasan, beautiful actress, straight black hair, modern stylish black dress, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "ranbir_kapoor": "Ranbir Kapoor from the movie Animal, with long hair and thick beard, intense look, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "ranveer_singh": "Ranveer Singh as Bajirao from the movie Bajirao Mastani, royal warrior outfit, mustache, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "alia_bhatt": "Alia Bhatt as Gangubai, wearing white saree, red bindi, round glasses, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "deepika_padukone": "Deepika Padukone from the movie Padmaavat, beautiful queen wearing heavy traditional Rajasthani lehenga and jewelry, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "vicky_kaushal": "Vicky Kaushal from the movie Uri, wearing military uniform, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "kiara_advani": "Kiara Advani, beautiful Bollywood actress, wearing a modern elegant gown, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "shah_rukh_khan": "Shah Rukh Khan, the king of Bollywood, iconic open arms pose, dimpled smile, wearing a black suit, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "katrina_kaif": "Katrina Kaif, beautiful Bollywood actress, wearing a red designer dress, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "hrithik_roshan": "Hrithik Roshan as Kabir from the movie War, extremely handsome, short hair, light stubble, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "priyanka_chopra": "Priyanka Chopra, beautiful Bollywood actress, glamorous gown, confident smile, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "kareena_kapoor": "Kareena Kapoor as Geet from Jab We Met, wearing traditional outfit, talkative happy expression, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "ayushmann_khurrana": "Ayushmann Khurrana, handsome actor with glasses, neat jacket, smiling, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "shraddha_kapoor": "Shraddha Kapoor, beautiful cute actress, smiling, wearing a floral dress, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "rajkummar_rao": "Rajkummar Rao, handsome Bollywood actor, simple classy blazer, friendly smile, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style",
    "kriti_sanon": "Kriti Sanon, beautiful tall Bollywood actress, modern chic outfit, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style"
}

output_dir = "assets/stars"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

print("Scanning for placeholder or failed portraits (size < 20KB)...")
failed_stars = []
for star_id in star_prompts.keys():
    file_path = os.path.join(output_dir, f"{star_id}.png")
    if not os.path.exists(file_path):
        failed_stars.append(star_id)
    else:
        size = os.path.getsize(file_path)
        if size < 20000:
            print(f"Placeholder detected: {star_id} ({size} bytes)")
            failed_stars.append(star_id)

if not failed_stars:
    print("All 30 portraits downloaded successfully!")
    exit(0)

print(f"Retrying download for {len(failed_stars)} failed stars: {failed_stars}")
for star_id in failed_stars:
    file_path = os.path.join(output_dir, f"{star_id}.png")
    prompt = star_prompts[star_id]
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"
    
    success = False
    for attempt in range(1, 6):
        print(f"Attempt {attempt}/5: Downloading {star_id}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                content = response.read()
                # Verify that we actually got a decent sized image file
                if len(content) > 20000:
                    with open(file_path, "wb") as f:
                        f.write(content)
                    print(f"Successfully downloaded {star_id} ({len(content)} bytes).")
                    success = True
                    break
                else:
                    print(f"Attempt {attempt} returned small size ({len(content)} bytes), retrying...")
        except Exception as e:
            print(f"Attempt {attempt} failed: {e}")
        
        # Exponential backoff
        time.sleep(attempt * 2.0)
        
    if not success:
        print(f"CRITICAL: Failed to download {star_id} after 5 attempts.")

print("Retry process finished.")
