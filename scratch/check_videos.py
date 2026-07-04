import urllib.request
import json
import urllib.error

VICTORY_SONGS = {
    "allu_arjun":         "Q1w226eM6m8",
    "prabhas":            "n45s2sVd4z0",
    "mahesh_babu":        "ZBDSNy4Yn9Q",
    "jr_ntr":             "5vsOv_bcnhs",
    "ram_charan":         "OsU0CGZoV8E",
    "samantha":           "Qy9y5uK9J9w",
    "rashmika":           "Q11-0E3lR9s",
    "vijay_deverakonda":  "Vbu44JdN12s",
    "nani":               "2E_RRgTPtcU",
    "pooja_hegde":        "xY623-2h0vU",
    "kajal_aggarwal":     "lP467N3oQcM",
    "sai_pallavi":        "UI5F5G4tM_M",
    "keerthy_suresh":     "5vsOv_bcnhs",
    "anushka_shetty":     "n45s2sVd4z0",
    "shruti_haasan":      "vS2h3s-u3zY",
    "shah_rukh_khan":     "lP467N3oQcM",
    "ranbir_kapoor":      "2qFFGZEU788",
    "ranveer_singh":      "a6PUh-n0NYg",
    "alia_bhatt":         "B_9vMRH1n3M",
    "deepika_padukone":   "vK5E_aeBGYA",
    "hrithik_roshan":     "qFkNATtc3mc",
    "katrina_kaif":       "k4yXQkG2s1I",
    "priyanka_chopra":    "lP467N3oQcM",
    "kareena_kapoor":     "u0qO9b4_9n8",
    "vicky_kaushal":      "LK7-_dgAVQE",
    "kiara_advani":       "kY41LShC1YI",
    "ayushmann_khurrana": "kY41LShC1YI",
    "shraddha_kapoor":    "kY41LShC1YI",
    "rajkummar_rao":      "lP467N3oQcM",
    "kriti_sanon":        "r6gM5yD-VqQ"
}

for star, video_id in VICTORY_SONGS.items():
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            print(f"[{star}] SUCCESS: Video ID {video_id} ({data.get('title')})")
    except urllib.error.HTTPError as e:
        print(f"[{star}] ERROR {e.code}: Video ID {video_id} is invalid or blocked")
    except Exception as e:
        print(f"[{star}] EXCEPTION: {e}")
