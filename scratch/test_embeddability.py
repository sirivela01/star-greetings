import urllib.request
import urllib.error
import re

def check_embed_page(video_id):
    url = f"https://www.youtube.com/embed/{video_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            # Check for playability status or embedding restrictions
            is_embeddable = True
            reason = ""
            
            # Look for playabilityStatus in ytInitialPlayerResponse or ytPlayerConfig
            match = re.search(r'"playabilityStatus"\s*:\s*(\{.+?\})', html)
            if match:
                status_block = match.group(1)
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
                
            if "watch-on-youtube" in html or "Watch on YouTube" in html:
                # Note: some embeddable videos might have "watch on youtube" button, so this alone is not enough, but helpful context
                pass
                
            return is_embeddable, reason
    except urllib.error.HTTPError as e:
        return False, f"HTTP Error {e.code}"
    except Exception as e:
        return False, f"Exception: {e}"

# Test with a few IDs
test_ids = {
    "Chuttamalle (Success)": "5vsOv_bcnhs",
    "Kalaavathi (Success)": "Vbu44JdN12s",
    "Invalid ID": "n45s2sVd4z0",
}

for name, vid in test_ids.items():
    ok, res = check_embed_page(vid)
    print(f"{name} ({vid}): Embeddable={ok}, Reason={res}")
