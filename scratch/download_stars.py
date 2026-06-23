import os
import urllib.request
import urllib.parse
import time

# List of all 30 stars with highly specific movie character prompts for maximum likeness using the FLUX model
star_prompts = {
    "prabhas": "A high-quality digital art portrait of Tollywood actor Prabhas in his iconic role from the movie Baahubali, wearing ancient royal warrior armor, confident look, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "mahesh_babu": "A high-quality digital art portrait of Tollywood actor Mahesh Babu, clean-shaven with his signature neat medium dark hair and kind eyes, wearing a classy collared shirt, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "allu_arjun": "A high-quality digital art portrait of Tollywood actor Allu Arjun as Pushpa Raj from the movie Pushpa, with thick styled hair and trendy beard, wearing a cool open shirt, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "jr_ntr": "A high-quality digital art portrait of Tollywood actor Jr NTR in his iconic role from the movie RRR, intense determined eyes, wearing a simple beige kurta, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "ram_charan": "A high-quality digital art portrait of Tollywood actor Ram Charan as Alluri Sitarama Raju from the movie RRR, wearing a traditional uniform, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "samantha": "A high-quality digital art portrait of Tollywood actress Samantha Ruth Prabhu, bright charming smile, large brown eyes, long wavy brown hair, wearing a modern elegant saree with a delicate gold necklace, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "rashmika": "A high-quality digital art portrait of Tollywood actress Rashmika Mandanna as Srivalli from the movie Pushpa, cute expression, wearing traditional lehenga, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "pooja_hegde": "A high-quality digital art portrait of Tollywood actress Pooja Hegde, wearing a stunning modern lehenga, elegant posture, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "nani": "A high-quality digital art portrait of Tollywood actor Nani, wearing a casual checkered shirt, smiling warmly, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "vijay_deverakonda": "A high-quality digital art portrait of Tollywood actor Vijay Deverakonda as Arjun Reddy, with wavy dark hair and full beard, wearing sunglasses and black shirt, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "keerthy_suresh": "A high-quality digital art portrait of Tollywood actress Keerthy Suresh as Savitri from the movie Mahanati, traditional retro style, traditional silk saree, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "anushka_shetty": "A high-quality digital art portrait of Tollywood actress Anushka Shetty as Devasena from the movie Baahubali, beautiful queen wearing blue saree and jewelry, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "kajal_aggarwal": "A high-quality digital art portrait of Tollywood actress Kajal Aggarwal as Mitravinda from the movie Magadheera, beautiful princess wearing traditional lehenga, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "sai_pallavi": "A high-quality digital art portrait of Tollywood actress Sai Pallavi, simple elegant saree, long curly hair, sweet smile, natural skin, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "shruti_haasan": "A high-quality digital art portrait of Tollywood actress Shruti Haasan, straight black hair, modern stylish black dress, confident expression, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "ranbir_kapoor": "A high-quality digital art portrait of Bollywood actor Ranbir Kapoor from the movie Animal, with long hair and thick beard, intense look, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "ranveer_singh": "A high-quality digital art portrait of Bollywood actor Ranveer Singh as Bajirao from the movie Bajirao Mastani, royal warrior outfit with mustache, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "alia_bhatt": "A high-quality digital art portrait of Bollywood actress Alia Bhatt as Gangubai, wearing white saree, red bindi, round glasses, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "deepika_padukone": "A high-quality digital art portrait of Bollywood actress Deepika Padukone from the movie Padmaavat, beautiful queen wearing heavy traditional Rajasthani lehenga and jewelry, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "vicky_kaushal": "A high-quality digital art portrait of Bollywood actor Vicky Kaushal from the movie Uri, wearing military uniform, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "kiara_advani": "A high-quality digital art portrait of Bollywood actress Kiara Advani, wearing a modern elegant gown, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "shah_rukh_khan": "A high-quality digital art portrait of Bollywood actor Shah Rukh Khan, the king of Bollywood, dimpled smile, wearing a black suit, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "katrina_kaif": "A high-quality digital art portrait of Bollywood actress Katrina Kaif, wearing a red designer dress, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "hrithik_roshan": "A high-quality digital art portrait of Bollywood actor Hrithik Roshan as Kabir from the movie War, extremely handsome, short hair, light stubble, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "priyanka_chopra": "A high-quality digital art portrait of Bollywood actress Priyanka Chopra, glamorous gown, confident smile, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "kareena_kapoor": "A high-quality digital art portrait of Bollywood actress Kareena Kapoor as Geet from Jab We Met, wearing traditional outfit, happy expression, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "ayushmann_khurrana": "A high-quality digital art portrait of Bollywood actor Ayushmann Khurrana, handsome actor with glasses, neat jacket, smiling, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "shraddha_kapoor": "A high-quality digital art portrait of Bollywood actress Shraddha Kapoor, cute expression, smiling, wearing a floral dress, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "rajkummar_rao": "A high-quality digital art portrait of Bollywood actor Rajkummar Rao, simple classy blazer, friendly smile, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness",
    "kriti_sanon": "A high-quality digital art portrait of Bollywood actress Kriti Sanon, modern chic outfit, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style, 8k resolution, highly detailed face, 99% facial likeness"
}

output_dir = "assets/stars"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

print("Starting generation of 99% identical FLUX star portraits...")
for star_id, prompt in star_prompts.items():
    file_path = os.path.join(output_dir, f"{star_id}.png")
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&model=flux"
    
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
    
    # Rate limit politeness between stars
    time.sleep(1.0)

print("All downloads finished.")
