import urllib.request
import re

def check_embed_page(video_id):
    url = f"https://www.youtube.com/embed/{video_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            is_embeddable = True
            reason = ""
            
            # Check for playabilityStatus in ytInitialPlayerResponse
            match = re.search(r'"playabilityStatus"\s*:\s*(\{.+?\})', html)
            if match:
                status_block = match.group(1)
                print(f"[{video_id}] Status block snippet:", status_block[:300])
                if '"UNPLAYABLE"' in status_block or '"ERROR"' in status_block or '"LOGIN_REQUIRED"' in status_block:
                    is_embeddable = False
                    reason = "Unplayable/Blocked in Embed"
                    # Try to extract the reason text
                    reason_match = re.search(r'"reason"\s*:\s*"([^"]+)"', status_block)
                    if reason_match:
                        reason = reason_match.group(1)
            
            if '"embeddable":false' in html:
                is_embeddable = False
                reason = "embeddable:false in config"
                
            return is_embeddable, reason
    except Exception as e:
        return False, str(e)

test_ids = {
    "Nani (HIT 3)": "Q8kpnStG7ss",
    "Shruti Haasan (Charuseela)": "4lZeiG5uLvY"
}

for name, vid in test_ids.items():
    ok, res = check_embed_page(vid)
    print(f"{name} ({vid}): Embeddable={ok}, Reason={res}")
