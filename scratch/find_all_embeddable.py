import urllib.request
import urllib.parse
import json
import re
import urllib.error
import time

VICTORY_SONGS_INFO = {
    "allu_arjun":         {"song": "Srivalli", "movie": "Pushpa"},
    "prabhas":            {"song": "Dhivara", "movie": "Baahubali"},
    "mahesh_babu":        {"song": "Mind Block", "movie": "Sarileru Neekevvaru"},
    "jr_ntr":             {"song": "Chuttamalle", "movie": "Devara"},
    "ram_charan":         {"song": "Naatu Naatu", "movie": "RRR"},
    "samantha":           {"song": "Oo Antava", "movie": "Pushpa"},
    "rashmika":           {"song": "Saami Saami", "movie": "Pushpa"},
    "vijay_deverakonda":  {"song": "Kalaavathi", "movie": "Sarkaru Vaari Paata"},
    "nani":               {"song": "Adiga Adiga", "movie": "Ninnu Kori"},
    "pooja_hegde":        {"song": "Butta Bomma", "movie": "Ala Vaikunthapurramuloo"},
    "kajal_aggarwal":     {"song": "Dhinka Chika", "movie": "Ready"},
    "sai_pallavi":        {"song": "Rowdy Baby", "movie": "Maari 2"},
    "keerthy_suresh":     {"song": "Chamkeela Angeelesi", "movie": "Dasara"},
    "anushka_shetty":     {"song": "Dhivara", "movie": "Baahubali"},
    "shruti_haasan":      {"song": "Charuseela", "movie": "Srimanthudu"},
    "shah_rukh_khan":     {"song": "Chaiyya Chaiyya", "movie": "Dil Se"},
    "ranbir_kapoor":      {"song": "Channa Mereya", "movie": "Ae Dil Hai Mushkil"},
    "ranveer_singh":      {"song": "Malhari", "movie": "Bajirao Mastani"},
    "alia_bhatt":         {"song": "Kesariya", "movie": "Brahmastra"},
    "deepika_padukone":   {"song": "Nagada Sang Dhol", "movie": "Ram-Leela"},
    "hrithik_roshan":     {"song": "Ghungroo", "movie": "War"},
    "katrina_kaif":       {"song": "Kala Chashma", "movie": "Baar Baar Dekho"},
    "priyanka_chopra":    {"song": "Desi Girl", "movie": "Dostana"},
    "kareena_kapoor":     {"song": "Chammak Challo", "movie": "Ra.One"},
    "vicky_kaushal":      {"song": "Tauba Tauba", "movie": "Bad Newz"},
    "kiara_advani":       {"song": "Ranjha", "movie": "Shershaah"},
    "ayushmann_khurrana": {"song": "Bala", "movie": "Bala"},
    "shraddha_kapoor":    {"song": "Galliyan", "movie": "Ek Villain"},
    "rajkummar_rao":      {"song": "Aao Kabhi Haveli Pe", "movie": "Stree"},
    "kriti_sanon":        {"song": "Param Sundari", "movie": "Mimi"}
}

def search_youtube(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            video_ids = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
            seen = set()
            unique_ids = []
            for vid in video_ids:
                if vid not in seen:
                    seen.add(vid)
                    unique_ids.append(vid)
            return unique_ids
    except Exception as e:
        print(f"Error searching '{query}': {e}")
        return []

def check_oembed(video_id):
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return True, data.get('title')
    except urllib.error.HTTPError as e:
        return False, f"HTTP Error {e.code}"
    except Exception as e:
        return False, str(e)

results = {}
for star, info in VICTORY_SONGS_INFO.items():
    song = info["song"]
    movie = info["movie"]
    
    # Try searching for song with lyrics
    queries = [
        f"{song} {movie} lyrics",
        f"{song} {movie} song",
        f"{song} lyrics"
    ]
    
    found_id = None
    found_title = None
    
    for query in queries:
        print(f"[{star}] Searching: '{query}'...")
        vids = search_youtube(query)
        # Check first 5 vids
        for vid in vids[:5]:
            ok, title = check_oembed(vid)
            if ok:
                found_id = vid
                found_title = title
                break
        if found_id:
            break
        time.sleep(0.5) # rate limit friendly
        
    if found_id:
        results[star] = {"videoId": found_id, "title": found_title, "song": song, "movie": movie}
        print(f"[{star}] FOUND SUCCESS: {found_id} ({found_title})")
    else:
        results[star] = None
        print(f"[{star}] FAILED to find any embeddable video")
    time.sleep(0.5)

# Save results
with open("scratch/embeddable_songs_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nAll done!")
