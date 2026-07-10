import os
import json
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Helper to query Firebase REST API
def get_firebase_data(path, db_url=None):
    if not db_url:
        db_url = os.environ.get("FIREBASE_DATABASE_URL")
    if not db_url:
        return None
    db_url = db_url.rstrip('/')
    try:
        response = requests.get(f"{db_url}/{path}.json")
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Firebase read error: {e}")
    return None

def update_firebase_data(path, data, db_url=None):
    if not db_url:
        db_url = os.environ.get("FIREBASE_DATABASE_URL")
    if not db_url:
        return False
    db_url = db_url.rstrip('/')
    try:
        response = requests.patch(f"{db_url}/{path}.json", json=data)
        return response.status_code == 200
    except Exception as e:
        print(f"Firebase write error: {e}")
    return False

# Server-side Heuristic Bot logic endpoints
@app.route('/api/bot/decision/play', methods=['POST'])
def bot_decision_play():
    """
    Decides bot's turn: which card to play and whether to bluff/claim match.
    """
    try:
        body = request.json or {}
        hand = body.get("hand", [])  # list of card objects: [{id: "prabhas", name: "Prabhas", instanceId: "..."}]
        pot = body.get("pot", [])    # cards in pot
        revealed_cards = body.get("revealed_cards", []) # cards played/revealed this round
        player_id = body.get("playerId")
        current_bet = body.get("currentBet", 25)
        difficulty = body.get("difficulty", "normal").lower()
        db_url = body.get("dbUrl") # optional fallback from client config
        
        if not hand:
            return jsonify({"error": "Empty hand"}), 400

        # Retrieve player bluff history
        player_bluff_rate = 0.3
        if player_id:
            stats = get_firebase_data(f"playerStats/{player_id}/bluffHistory", db_url)
            if stats:
                attempts = stats.get("bluffAttempts", 0)
                caught = stats.get("bluffCaught", 0)
                if attempts > 0:
                    player_bluff_rate = (caught + 1) / (attempts + 2) # Laplasian smoothing
        
        # Check if bot has a legitimate match
        top_card_pot = pot[-1] if pot else None
        matching_cards = [c for c in hand if top_card_pot and c["id"] == top_card_pot["id"]]
        
        # Determine bluffing probability P_bluff
        # Easy: low bluff rate (0.1)
        # Normal: standard heuristic (0.25)
        # Hard: strategic calculation (0.4)
        if difficulty == "easy":
            P_bluff = 0.1
        elif difficulty == "hard":
            P_bluff = 0.35
        else:
            P_bluff = 0.22

        # Desperation factor: fewer cards in hand -> more likely to bluff
        hand_size = len(hand)
        desperation = max(0, (30 - hand_size) * 0.01) # up to +0.25
        P_bluff += desperation

        # Pot size factor: larger pot -> higher incentive to bluff
        pot_size = len(pot)
        pot_incentive = min(0.2, pot_size * 0.02)
        P_bluff += pot_incentive

        # Player's historical bluff-catching tendency
        P_bluff -= (player_bluff_rate * 0.2)
        P_bluff = max(0.05, min(0.85, P_bluff))

        # Decide action
        rand_val = random.random()
        
        # If we have a matching card, we almost always play it (90% of the time, 100% on hard)
        if matching_cards:
            should_play_match = True
            if difficulty != "hard" and rand_val < 0.1:
                should_play_match = False
            
            if should_play_match:
                chosen_card = random.choice(matching_cards)
                return jsonify({
                    "action": "real_match_claim",
                    "card": chosen_card,
                    "reason": "Played matching card legitimately"
                })

        # No match played, or decided to save/bluff instead
        if rand_val < P_bluff:
            # Decide to bluff! Play a non-matching card but claim it matches
            non_matching = [c for c in hand if not top_card_pot or c["id"] != top_card_pot["id"]]
            if non_matching and top_card_pot:
                # Choose the card that is least revealed to avoid suspicion
                chosen_card = min(non_matching, key=lambda c: revealed_cards.count(c["id"]))
                return jsonify({
                    "action": "bluff_claim",
                    "card": chosen_card,
                    "declared_id": top_card_pot["id"],
                    "reason": f"Bluffed claiming matching {top_card_pot['name']}"
                })

        # Default action: Play card normally (no claim, goes to pot)
        chosen_card = hand[0] # Play top card by default
        return jsonify({
            "action": "play_normal",
            "card": chosen_card,
            "reason": "Played normally without match claim"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/bot/decision/call_bluff', methods=['POST'])
def bot_decision_call_bluff():
    """
    Decides whether the bot should call "Bluff!" on the human player's claim.
    """
    try:
        body = request.json or {}
        hand_size = body.get("handSize", 30)
        pot = body.get("pot", [])
        revealed_cards = body.get("revealed_cards", [])
        player_id = body.get("playerId")
        difficulty = body.get("difficulty", "normal").lower()
        declared_star_id = body.get("declaredStarId")
        bot_hand_cards = body.get("botHand", []) # list of bot's card IDs or objects
        db_url = body.get("dbUrl")
        
        if not declared_star_id:
            return jsonify({"call_bluff": False, "reason": "No card declared"}), 200

        # Retrieve player bluff history
        player_bluff_rate = 0.3
        if player_id:
            stats = get_firebase_data(f"playerStats/{player_id}/bluffHistory", db_url)
            if stats:
                attempts = stats.get("bluffAttempts", 0)
                caught = stats.get("bluffCaught", 0)
                if attempts > 0:
                    player_bluff_rate = (caught + 1) / (attempts + 2)

        # Base call probability
        P_call = player_bluff_rate

        # Desperation adjustment (fewer cards in player hand -> more likely they are bluffing)
        P_call += max(0, (30 - hand_size) * 0.01)

        # Bot's hand analysis: if bot holds copies of the declared card, the player is less likely to have it.
        # There are only 4 copies of each card in the deck.
        bot_copies = sum(1 for c in bot_hand_cards if (c if isinstance(c, str) else c.get("id")) == declared_star_id)
        if bot_copies == 1:
            P_call += 0.15
        elif bot_copies == 2:
            P_call += 0.35
        elif bot_copies >= 3:
            P_call += 0.75 # Extremely likely to be a bluff

        # Discard/Revealed pile analysis: if copies are already revealed, player is less likely to have it.
        revealed_copies = sum(1 for c in revealed_cards if (c if isinstance(c, str) else c.get("id")) == declared_star_id)
        P_call += (revealed_copies * 0.20)

        # Apply difficulty adjustments
        if difficulty == "easy":
            # Easy bot rarely calls bluffs (static low probability)
            call_bluff = random.random() < 0.12
        elif difficulty == "hard":
            # Hard bot makes the optimal threshold decision
            call_bluff = (P_call >= 0.45)
        else:
            # Normal bot has standard randomized decision based on P_call
            call_bluff = random.random() < P_call

        return jsonify({
            "call_bluff": bool(call_bluff),
            "reason": f"Calculated call probability: {P_call:.2f} (difficulty: {difficulty})"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/player/stats/bluff', methods=['POST'])
def update_player_bluff_stats():
    """
    Increments a player's bluff attempt or caught stat.
    """
    try:
        body = request.json or {}
        player_id = body.get("playerId")
        stat_type = body.get("type") # "attempt", "caught"
        db_url = body.get("dbUrl")
        
        if not player_id or not stat_type:
            return jsonify({"error": "Missing playerId or type"}), 400
            
        stats_path = f"playerStats/{player_id}/bluffHistory"
        current_stats = get_firebase_data(stats_path, db_url) or {}
        
        if stat_type == "attempt":
            current_stats["bluffAttempts"] = current_stats.get("bluffAttempts", 0) + 1
        elif stat_type == "caught":
            current_stats["bluffCaught"] = current_stats.get("bluffCaught", 0) + 1
            current_stats["bluffAttempts"] = current_stats.get("bluffAttempts", 0) + 1 # Caught is also an attempt
            
        update_firebase_data(stats_path, current_stats, db_url)
        return jsonify({"success": True, "stats": current_stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def calculate_levenshtein_distance(s1, s2):
    if len(s1) < len(s2):
        return calculate_levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
        
    return previous_row[-1]

def get_ml_voice_match(transcript, roster_names):
    if not transcript or not roster_names:
        return None

    best_match = None
    best_score = 0.0

    # Common phonetic substitutions in speech recognition
    common_subs = {
        "hello": "allu",
        "nowthat": "nagarjuna",
        "nowthere": "nagarjuna",
        "now": "nag",
        "that": "arjuna",
        "ther": "arjuna",
        "there": "arjuna",
        "parbas": "prabhas",
        "pravas": "prabhas",
        "prabas": "prabhas",
        "tarak": "ntr",
        "junior": "jr",
        "sam": "samantha"
    }

    spoken_clean = transcript.lower().strip()
    for word, replacement in common_subs.items():
        spoken_clean = spoken_clean.replace(word, replacement)
    
    spoken_compact = spoken_clean.replace(" ", "")

    for star_name in roster_names:
        star_clean = star_name.lower().strip()
        star_compact = star_clean.replace(" ", "")
        
        # 1. Exact match after phonetic replacement
        if spoken_compact == star_compact:
            return star_name
            
        # 2. Substring match
        if spoken_compact in star_compact or star_compact in spoken_compact:
            score = min(len(spoken_compact), len(star_compact)) / max(len(spoken_compact), len(star_compact))
            if score > best_score:
                best_score = score
                best_match = star_name
                
        # 3. Levenshtein edit distance similarity
        dist = calculate_levenshtein_distance(spoken_compact, star_compact)
        max_len = max(len(spoken_compact), len(star_compact))
        similarity = 1.0 - (dist / max_len) if max_len > 0 else 0.0
        
        if similarity > best_score:
            best_score = similarity
            best_match = star_name

    # Confident match threshold
    if best_score >= 0.70:
        return best_match

    return None

def query_openai_whisper(audio_bytes, mime_type):
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        return None
    
    ext = "webm"
    if "mp4" in mime_type:
        ext = "mp4"
    elif "ogg" in mime_type:
        ext = "ogg"
    elif "wav" in mime_type:
        ext = "wav"
        
    headers = {
        "Authorization": f"Bearer {openai_key}"
    }
    files = {
        "file": (f"audio.{ext}", audio_bytes, mime_type)
    }
    data = {
        "model": "whisper-1"
    }
    
    try:
        url = "https://api.openai.com/v1/audio/transcriptions"
        response = requests.post(url, headers=headers, files=files, data=data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            return result.get("text", "").strip()
        else:
            print(f"OpenAI Whisper API error (status {response.status_code}): {response.text}")
    except Exception as e:
        print(f"Failed to query OpenAI Whisper API: {e}")
    return None

def query_openai_gpt(sys_instruction, prompt):
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        return None
        
    headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json"
    }
    json_data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": sys_instruction},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.0,
        "max_tokens": 50
    }
    
    try:
        url = "https://api.openai.com/v1/chat/completions"
        response = requests.post(url, headers=headers, json=json_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            choices = result.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "").strip().replace('"', '')
        else:
            print(f"OpenAI GPT API error (status {response.status_code}): {response.text}")
    except Exception as e:
        print(f"Failed to query OpenAI GPT API: {e}")
    return None

@app.route('/api/voice/transcribe', methods=['POST'])
def transcribe_voice_audio():
    """
    Receives a raw audio file from the client, sends it to OpenAI Whisper (ASR) + GPT (NLP)
    for high-accuracy audio transcription & name resolution, with Gemini fallback.
    """
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        roster_names_raw = request.form.get("roster", "[]")
        try:
            roster_names = json.loads(roster_names_raw)
        except Exception:
            roster_names = []
            
        audio_bytes = audio_file.read()
        if not audio_bytes:
            return jsonify({"error": "Empty audio file"}), 400
            
        # Determine mime type (default to audio/webm or audio/wav)
        mime_type = audio_file.content_type or "audio/webm"
        if "octet-stream" in mime_type or not mime_type:
            mime_type = "audio/webm"

        sys_instruction = (
            "You are an expert voice recognition and transcription engine for Indian actor names in a card game. "
            "The user is speaking an actor's name (like Prabhas, Allu Arjun, Mahesh Babu, Samantha, Nagarjuna, etc.). "
            "You will be given the raw audio/transcript and the list of active actor names in play (RAG Context). "
            "Identify what name they are saying, and match it to the closest actor name from the list. "
            "Return ONLY the exact matched star name from the list. "
            "If it matches absolutely nothing, return the transcription of the name they spoke. "
            "Do not add any explanations, quotes, punctuation, or other text."
        )

        # 1. Try OpenAI Whisper (ASR) + GPT (NLP) Pipeline if API Key is configured
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            print("🎤 OpenAI pipeline selected for ASR transcription")
            whisper_text = query_openai_whisper(audio_bytes, mime_type)
            if whisper_text:
                print(f"🎤 OpenAI Whisper (ASR) resolved transcript: '{whisper_text}'")
                prompt = (
                    f"Identify the actor name from this spoken transcript.\n"
                    f"Spoken Transcript: '{whisper_text}'\n"
                    f"RAG Context (Possible Star Names in Play):\n"
                    f"{json.dumps(roster_names)}\n"
                    f"\nRemember: 'Hello Arjun' or 'Hello' or 'Arjun' is 'Allu Arjun'. 'Now That' or similar is 'Nagarjuna'. "
                    f"Return ONLY the exact matched name."
                )
                corrected_name = query_openai_gpt(sys_instruction, prompt)
                if corrected_name:
                    print(f"🎤 OpenAI GPT (NLP) resolved matched name: '{corrected_name}'")
                    return jsonify({"success": True, "transcription": corrected_name})

        # 2. Fallback: Gemini Client
        global gemini_client
        if not gemini_client and os.environ.get("GEMINI_API_KEY"):
            try:
                gemini_client = genai.Client()
            except Exception as e:
                print(f"Lazy init of Gemini client failed: {e}")

        if gemini_client:
            print("🎤 Gemini pipeline selected for ASR transcription")
            prompt = (
                f"Identify the actor name spoken in this audio clip.\n"
                f"RAG Context (Possible Star Names in Play):\n"
                f"{json.dumps(roster_names)}\n"
                f"\nRemember: 'Hello Arjun' or 'Hello' or 'Arjun' is 'Allu Arjun'. 'Now That' or similar is 'Nagarjuna'. "
                f"Return ONLY the exact matched name."
            )
            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[
                        types.Part.from_bytes(
                            data=audio_bytes,
                            mime_type=mime_type
                        ),
                        prompt
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instruction,
                        max_output_tokens=50,
                    )
                )
                corrected_name = response.text.strip().replace('"', '')
                print(f"🎤 Gemini Audio Transcription resolved: '{corrected_name}'")
                return jsonify({"success": True, "transcription": corrected_name})
            except Exception as gemini_err:
                print(f"Gemini audio transcription failed: {gemini_err}")

        # Fallback if both offline
        return jsonify({"success": False, "error": "GenAI Service Unavailable"}), 503
    except Exception as e:
        print(f"Error in audio transcription endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/voice/correct', methods=['POST'])
def correct_voice_input():
    """
    Uses Hybrid Machine Learning (edit distance phonetics) and OpenAI GPT / Gemini LLM RAG to correct spoken actor names.
    """
    try:
        body = request.json or {}
        transcript = body.get("transcript", "").strip()
        roster_names = body.get("roster", [])
        
        if not transcript:
            return jsonify({"corrected": ""})
            
        if not roster_names:
            return jsonify({"corrected": transcript})

        # 1. Try high-confidence Machine Learning phonetic alignment first
        ml_match = get_ml_voice_match(transcript, roster_names)
        if ml_match:
            print(f"🤖 ML Phonetic Matcher resolved: '{transcript}' -> '{ml_match}'")
            return jsonify({"corrected": ml_match})

        sys_instruction = (
            "You are an expert phonetic parser and auto-correction engine for Indian actor names. "
            "The user is playing a cinema game and spoke a name. The speech recognition transcribed it as a phonetic approximation. "
            "Your goal is to match this approximation to the single most likely star from the provided roster. "
            "Return ONLY the exact matched star name from the roster (e.g. 'Nagarjuna', 'Prabhas'). "
            "If it does not resemble any star in the roster, return the original transcription as-is. "
            "Do not include quotes, explanations, or any other characters."
        )
        prompt = (
            f"Spoken text phonetic transcription: '{transcript}'\n"
            f"Roster of stars in play (RAG Context):\n"
            f"{json.dumps(roster_names)}\n"
            f"\nIdentify if the spoken transcription resembles one of the names in the roster phonetically, "
            f"for example, 'Hello Arjun' or 'Hello' sounds exactly like 'Allu Arjun', "
            f"'Now That' sounds exactly like 'Nagarjuna', "
            f"'Bunny' or 'Allu' is 'Allu Arjun', 'Sam' is 'Samantha Ruth Prabhu', 'NTR' or 'Tarak' is 'Jr NTR'. "
            f"Output ONLY the corrected name or the original transcription if no match is found."
        )

        # 2. Try OpenAI GPT if API Key is configured
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            corrected_name = query_openai_gpt(sys_instruction, prompt)
            if corrected_name:
                print(f"🤖 OpenAI GPT voice correction resolved: '{corrected_name}'")
                return jsonify({"corrected": corrected_name})

        # 3. Fallback: Gemini Client
        global gemini_client
        if not gemini_client and os.environ.get("GEMINI_API_KEY"):
            try:
                gemini_client = genai.Client()
            except Exception as e:
                print(f"Lazy init of Gemini client failed: {e}")

        if gemini_client:
            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instruction,
                        max_output_tokens=50,
                    )
                )
                corrected_name = response.text.strip().replace('"', '')
                print(f"🤖 Gemini voice correction resolved: '{corrected_name}'")
                return jsonify({"corrected": corrected_name})
            except Exception as gemini_err:
                print(f"Gemini voice correction failed: {gemini_err}")

        # Fallback local dictionary mapping if both offline
        clean_transcript = transcript.lower().replace(" ", "")
        local_mappings = {
            "nowthat": "Nagarjuna",
            "nowthere": "Nagarjuna",
            "helloarjun": "Allu Arjun",
            "hello": "Allu Arjun",
            "nagarjuna": "Nagarjuna",
            "nag": "Nagarjuna",
            "prabas": "Prabhas",
            "prabhas": "Prabhas",
            "baahubali": "Prabhas",
            "bunny": "Allu Arjun",
            "allu": "Allu Arjun",
            "alluarjun": "Allu Arjun",
            "ntr": "Jr NTR",
            "tarak": "Jr NTR",
            "charan": "Ram Charan",
            "ramcharan": "Ram Charan",
            "sam": "Samantha Ruth Prabhu",
            "samantha": "Samantha Ruth Prabhu"
        }
        
        for key, val in local_mappings.items():
            if key in clean_transcript:
                return jsonify({"corrected": val})

        return jsonify({"corrected": transcript})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initialize Gemini Client
gemini_client = None
try:
    if os.environ.get("GEMINI_API_KEY"):
        gemini_client = genai.Client()
except Exception as e:
    print(f"Failed to initialize Gemini Client at startup: {e}")

FALLBACK_DIALOGUES = {
    "match_start": {
        "tollywood": [
            "Welcome to the high-voltage arena of Telugu Cinema! The stars are aligned, and the battle of blockbusters begins!",
            "Box office records are about to shatter! Get ready for punch dialogues and ultimate heroism!"
        ],
        "bollywood": [
            "Welcome to the grand musical stage of Hindi Cinema! Romance, drama, and magic are in the air!",
            "Picture abhi baaki hai, mere dost! Let the cinematic journey of Bollywood begin!"
        ]
    },
    "round_start": {
        "tollywood": [
            "A new hero enters the scene! The crowd goes wild, and the bet is placed!",
            "The screen is on fire! A new matchup begins at the box office!"
        ],
        "bollywood": [
            "The lights dim and a new melody begins. The actors take their places!",
            "The drama unfolds as another bet enters the pot. Who will steal the spotlight?"
        ]
    },
    "bluff_caught": {
        "tollywood": [
            "Caught red-handed! {caller} stands like an ultimate hero and exposes {player}'s duplicate claim!",
            "Sensational twist! {caller} shattered {player}'s box office lie like a true mass hero!"
        ],
        "bollywood": [
            "The disguise has fallen! {caller} caught {player} in a dramatic web of lies!",
            "Cheating in romance never works! {caller} called {player}'s bluff in pure melodramatic style!"
        ]
    },
    "bluff_success": {
        "tollywood": [
            "Gravity-defying bluff! {player} tricked the opponents and walked away with the pot like a superstar!",
            "Absolute mass response! {player}'s bluff was so powerful that everyone believed it!"
        ],
        "bollywood": [
            "A masterclass in acting! {player} fooled everyone and claimed the spotlight silently!",
            "What a performance! {player}'s lies were as sweet as a romantic duet, winning the entire pot!"
        ]
    },
    "round_win": {
        "tollywood": [
            "BOOM! {player} matched {card}! Absolute block-buster match wins the entire pot!",
            "Records broken! {player} landed a matching greeting and swept the board like a boss!"
        ],
        "bollywood": [
            "Wah! {player} found the perfect match for {card}! A standing ovation for winning the pot!",
            "A match made in heaven! {player} matches the card and claims the limelight!"
        ]
    },
    "game_over": {
        "tollywood": [
            "The blockbuster concludes! {player} is the ultimate Box Office Emperor of the match!",
            "End credits roll! {player} stood tallest and finished the game as a legendary hero!"
        ],
        "bollywood": [
            "The grand finale has arrived! {player} wins the heart of the audience and the game!",
            "And that's a wrap! {player} takes the final trophy with a superstar bow!"
        ]
    }
}

@app.route('/api/narrate', methods=['POST'])
def narrate_game():
    """
    Returns a dramatic cinematic commentary for in-game events using Gemini.
    """
    try:
        body = request.json or {}
        event = body.get("event", "round_start")
        player = body.get("player", "A player")
        round_num = body.get("round", 1)
        bet = body.get("bet", 25)
        theme = body.get("theme", "tollywood").lower()
        caller = body.get("caller", "Opponent")
        card = body.get("card", "")
        
        # Check if theme is valid
        if theme not in ["tollywood", "bollywood"]:
            theme = "tollywood"

        # Check if gemini client is available
        global gemini_client
        
        # Try to initialize if not done yet
        if not gemini_client and os.environ.get("GEMINI_API_KEY"):
            try:
                gemini_client = genai.Client()
            except Exception as e:
                print(f"Lazy init of Gemini client failed: {e}")

        if gemini_client:
            # Build system instruction based on theme
            if theme == "tollywood":
                sys_instruction = (
                    "You are a high-energy cinematic commentator for a card game. "
                    "Theme is Tollywood (Telugu cinema). Speak with high-voltage commercial movie flair, "
                    "using punch dialogues, mass hero references, box office hits, and dramatic energy. "
                    "Keep your commentary to exactly one or two short sentences. Be extremely punchy and dramatic."
                )
            else:
                sys_instruction = (
                    "You are a high-energy cinematic commentator for a card game. "
                    "Theme is Bollywood (Hindi cinema). Speak with romantic melodrama, musical grandeur, "
                    "dramatic emotional dialogues, and Bollywood superstar energy. "
                    "Keep your commentary to exactly one or two short sentences. Be extremely punchy and dramatic."
                )

            # Build prompt
            prompt = (
                f"Generate a 1-2 sentence dramatic commentary for the following event in the game:\n"
                f"- Event type: {event}\n"
                f"- Player active: {player}\n"
                f"- Current Round: {round_num}\n"
                f"- Pot consensus bet: {bet} coins\n"
            )
            if card:
                prompt += f"- Card played/matched: {card}\n"
            if caller and event == "bluff_caught":
                prompt += f"- Challenger who caught the bluff: {caller}\n"

            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instruction,
                        max_output_tokens=150,
                    )
                )
                commentary_text = response.text.strip().replace('"', '')
                return jsonify({"commentary": commentary_text})
            except Exception as gemini_err:
                print(f"Gemini generation error, falling back: {gemini_err}")

        # Fallback heuristic dialogues
        dialogue_options = FALLBACK_DIALOGUES.get(event, FALLBACK_DIALOGUES["round_start"]).get(theme, [])
        commentary_text = random.choice(dialogue_options)
        
        # Interpolate variables
        commentary_text = commentary_text.format(
            player=player,
            caller=caller,
            card=card,
            round=round_num,
            bet=bet
        )
        return jsonify({"commentary": commentary_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

import datetime

@app.route('/api/player/stats/match_end', methods=['POST'])
def match_end_stats():
    """
    Computes and updates Elo ratings in Firebase at game end.
    """
    try:
        body = request.json or {}
        player_id = body.get("playerId")
        opponent_id = body.get("opponentId", "Bot Ranbir")
        outcome = body.get("outcome") # "win", "loss", "draw"
        db_url = body.get("dbUrl")

        if not player_id:
            return jsonify({"error": "Missing playerId"}), 400

        # Retrieve current ratings
        p_rating_path = f"playerStats/{player_id}"
        o_rating_path = f"playerStats/{opponent_id}"

        p_data = get_firebase_data(p_rating_path, db_url) or {}
        o_data = get_firebase_data(o_rating_path, db_url) or {}

        r_p = p_data.get("rating", 1000)
        r_o = o_data.get("rating", 1000)

        games_p = p_data.get("gamesPlayed", 0)
        games_o = o_data.get("gamesPlayed", 0)

        # Elo computation
        e_p = 1.0 / (1.0 + 10.0 ** ((r_o - r_p) / 400.0))
        e_o = 1.0 / (1.0 + 10.0 ** ((r_p - r_o) / 400.0))

        if outcome == "win":
            s_p, s_o = 1.0, 0.0
        elif outcome == "loss":
            s_p, s_o = 0.0, 1.0
        else:
            s_p, s_o = 0.5, 0.5

        k = 32
        new_r_p = int(r_p + k * (s_p - e_p))
        new_r_o = int(r_o + k * (s_o - e_o))

        change_p = new_r_p - r_p
        change_o = new_r_o - r_o

        # Update Firebase
        update_firebase_data(p_rating_path, {
            "rating": new_r_p,
            "gamesPlayed": games_p + 1
        }, db_url)
        update_firebase_data(o_rating_path, {
            "rating": new_r_o,
            "gamesPlayed": games_o + 1
        }, db_url)

        # Track theme play count
        theme = body.get("theme")
        if theme:
            theme_plays_path = f"playerStats/{player_id}/themePlays"
            current_theme_plays = get_firebase_data(theme_plays_path, db_url) or {}
            current_theme_plays[theme] = current_theme_plays.get(theme, 0) + 1
            update_firebase_data(theme_plays_path, current_theme_plays, db_url)

        return jsonify({
            "playerRating": new_r_p,
            "opponentRating": new_r_o,
            "changePlayer": change_p,
            "changeOpponent": change_o
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/analytics/anomaly', methods=['POST'])
def detect_anomaly():
    """
    Checks turn history logs for rapid clicks, cheat win rates, or abnormal betting.
    """
    try:
        body = request.json or {}
        player_id = body.get("playerId")
        turns = body.get("turns", [])
        db_url = body.get("dbUrl")

        if not player_id:
            return jsonify({"error": "Missing playerId"}), 400

        if not turns:
            return jsonify({"isAnomaly": False, "confidence": 0.0, "flags": []})

        flags = []
        confidence = 0.0

        # Heuristic 1: Rapid turn times (bot scripts)
        times = [t.get("timeMs", 0) for t in turns if "timeMs" in t]
        if times:
            avg_time = sum(times) / len(times)
            if avg_time < 350:
                flags.append(f"Rapid turn times (Average: {avg_time:.0f}ms)")
                confidence += 0.45

        # Heuristic 2: Abnormal bluff success rate
        bluff_attempts = [t for t in turns if t.get("isBluff") == True]
        if len(bluff_attempts) >= 4:
            caught_count = sum(1 for t in bluff_attempts if t.get("caught") == True)
            success_rate = (len(bluff_attempts) - caught_count) / len(bluff_attempts)
            if success_rate > 0.90:
                flags.append(f"Suspicious bluff success rate ({success_rate * 100:.0f}%)")
                confidence += 0.40

        # Heuristic 3: Perfect large bet winning correlation
        large_bets = [t for t in turns if t.get("bet", 25) >= 75]
        if len(large_bets) >= 4:
            won_large_bets = sum(1 for t in large_bets if t.get("win") == True)
            if won_large_bets / len(large_bets) == 1.0:
                flags.append("Abnormal 100% win rate on high-bet turns")
                confidence += 0.35

        is_anomaly = confidence >= 0.45
        confidence = min(1.0, confidence)

        if is_anomaly:
            # Log anomaly to Firebase
            timestamp = datetime.datetime.now().isoformat().replace('.', '_')
            anomaly_log_path = f"anomalies/{player_id}/{timestamp}"
            anomaly_data = {
                "flags": flags,
                "confidence": confidence,
                "turnsCount": len(turns),
                "avgTurnTimeMs": sum(times) / len(times) if times else 0
            }
            update_firebase_data(anomaly_log_path, anomaly_data, db_url)

        return jsonify({
            "isAnomaly": bool(is_anomaly),
            "confidence": round(confidence, 2),
            "flags": flags
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/analytics/recommend', methods=['POST'])
def recommend_theme():
    """
    Suggests the next game theme card using play preference co-occurrence.
    """
    try:
        body = request.json or {}
        player_id = body.get("playerId")
        db_url = body.get("dbUrl")

        if not player_id:
            return jsonify({"recommendedTheme": "tollywood", "reason": "Default Tollywood recommendation (no player profile)"})

        theme_plays_path = f"playerStats/{player_id}/themePlays"
        plays = get_firebase_data(theme_plays_path, db_url) or {}

        # Suggest opposite theme (co-occurrence preference)
        t_count = plays.get("tollywood", 0)
        b_count = plays.get("bollywood", 0)

        if t_count > b_count:
            rec = "bollywood"
            reason = f"Based on your {t_count} games in Tollywood, try Bollywood for Hindi cinema blockbusters!"
        elif b_count > t_count:
            rec = "tollywood"
            reason = f"Based on your {b_count} games in Bollywood, try Tollywood for high-voltage action punch-lines!"
        else:
            # Default recommendation alternating randomly or to Tollywood
            rec = "tollywood" if random.random() < 0.5 else "bollywood"
            reason = "Recommended cinema deck to kickstart your next card battle!"

        return jsonify({
            "recommendedTheme": rec,
            "reason": reason
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-theme', methods=['POST'])
def generate_custom_theme():
    """
    Generates a custom deck of card names and image URLs based on a prompt.
    Caches custom decks in Firebase under customDecks/{deckId}.
    """
    try:
        body = request.json or {}
        prompt_text = body.get("prompt", "").strip()
        db_url = body.get("dbUrl")

        if not prompt_text:
            return jsonify({"error": "Prompt is required"}), 400

        # Slugify prompt to get a unique deckId
        import re
        deck_id = re.sub(r'[^a-z0-9]+', '_', prompt_text.lower()).strip('_')
        if not deck_id:
            deck_id = "custom_deck"

        # Check cache in Firebase
        cache_path = f"customDecks/{deck_id}"
        cached_deck = get_firebase_data(cache_path, db_url)
        if cached_deck:
            print(f"Returning cached custom deck: {deck_id}")
            return jsonify({
                "success": True,
                "deckId": deck_id,
                "themeName": cached_deck.get("themeName", prompt_text),
                "cards": cached_deck.get("cards", [])
            })

        # List of default fallback cards if Gemini fails or is not configured
        fallback_cards = [
            {"id": f"{deck_id}_1", "name": f"{prompt_text} Card 1", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=1"},
            {"id": f"{deck_id}_2", "name": f"{prompt_text} Card 2", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=2"},
            {"id": f"{deck_id}_3", "name": f"{prompt_text} Card 3", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=3"},
            {"id": f"{deck_id}_4", "name": f"{prompt_text} Card 4", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=4"},
            {"id": f"{deck_id}_5", "name": f"{prompt_text} Card 5", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=5"},
            {"id": f"{deck_id}_6", "name": f"{prompt_text} Card 6", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=6"},
            {"id": f"{deck_id}_7", "name": f"{prompt_text} Card 7", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=7"},
            {"id": f"{deck_id}_8", "name": f"{prompt_text} Card 8", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=8"},
            {"id": f"{deck_id}_9", "name": f"{prompt_text} Card 9", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=9"},
            {"id": f"{deck_id}_10", "name": f"{prompt_text} Card 10", "industry": prompt_text, "imagePath": f"https://image.pollinations.ai/p/movie_poster_of_{prompt_text}_character_epic_lighting?width=512&height=512&seed=10"}
        ]

        # Call Gemini client to generate characters list
        global gemini_client
        if not gemini_client and os.environ.get("GEMINI_API_KEY"):
            try:
                gemini_client = genai.Client()
            except Exception as e:
                print(f"Failed lazy init of Gemini client in generate-theme: {e}")

        cards_list = None
        if gemini_client:
            sys_instruction = (
                "You are an expert card game custom theme creator. "
                "Output ONLY a raw valid JSON array of character cards. Do not wrap in markdown or backticks."
            )
            prompt = (
                f"Generate a list of exactly 10 unique, famous characters/celebrities/icons matching the theme '{prompt_text}'. "
                f"For each character, return a JSON object with fields:\n"
                f"- 'name': Full name of the character/celebrity.\n"
                f"- 'id': Unique slug (e.g. 'iron_man', 'voldemort').\n"
                f"- 'imagePrompt': A detailed visual generation description (English) to create this character as a premium card portrait with theatrical lighting, epic background, movie poster style. Do not include quotes or backslashes.\n"
                f"\nEnsure the response is a single JSON array, e.g.:\n"
                f"[{{\"id\": \"char_id\", \"name\": \"Character Name\", \"imagePrompt\": \"description...\"}}]"
            )
            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instruction,
                        max_output_tokens=1000,
                        response_mime_type="application/json"
                    )
                )
                text = response.text.strip()
                # Clean markdown codeblocks if model didn't follow instruction
                if text.startswith("```"):
                    text = re.sub(r'^```(?:json)?\n|```$', '', text, flags=re.MULTILINE).strip()
                
                parsed_data = json.loads(text)
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    cards_list = []
                    for idx, item in enumerate(parsed_data):
                        char_id = item.get("id", f"char_{idx}")
                        unique_id = f"{deck_id}_{char_id}"
                        name = item.get("name", f"Character {idx+1}")
                        img_prompt = item.get("imagePrompt", f"movie poster of {name} from {prompt_text}")
                        import urllib.parse
                        encoded_prompt = urllib.parse.quote(img_prompt)
                        image_path = f"https://image.pollinations.ai/p/{encoded_prompt}?width=512&height=512&seed={random.randint(1, 100000)}"
                        cards_list.append({
                            "id": unique_id,
                            "name": name,
                            "industry": prompt_text,
                            "imagePath": image_path
                        })
            except Exception as gemini_err:
                print(f"Gemini theme generation failed, falling back: {gemini_err}")

        if not cards_list:
            cards_list = fallback_cards

        # Content moderation check
        moderation_keywords = ["nsfw", "naked", "porn", "gore", "kill", "suicide", "murder"]
        if any(w in prompt_text.lower() for w in moderation_keywords):
            return jsonify({"error": "Prompt contains moderated keywords"}), 400

        # Save to Firebase database cache
        new_deck_data = {
            "deckId": deck_id,
            "themeName": prompt_text,
            "cards": cards_list
        }
        update_firebase_data(cache_path, new_deck_data, db_url)

        return jsonify({
            "success": True,
            "deckId": deck_id,
            "themeName": prompt_text,
            "cards": cards_list
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Greetings Stack Economy API
@app.route('/api/player/greetings', methods=['GET'])
def get_player_greetings():
    userId = request.args.get("userId")
    db_url = request.args.get("dbUrl")
    if not userId:
        return jsonify({"error": "Missing userId"}), 400

    # Offline mode — no Firebase URL, return default
    if not db_url:
        return jsonify({"greetingsStack": 50})
    
    path = f"players/{userId}/greetingsStack"
    greetings = get_firebase_data(path, db_url)
    
    if greetings is None:
        # Initialize to 50 if it does not exist
        greetings = 50
        update_firebase_data(f"players/{userId}", {"greetingsStack": 50}, db_url)
        
    return jsonify({"greetingsStack": greetings})

@app.route('/api/player/greetings/start-match', methods=['POST'])
def start_match_deduction():
    body = request.json or {}
    userId = body.get("userId")
    db_url = body.get("dbUrl")
    if not userId:
        return jsonify({"error": "Missing userId"}), 400

    # Offline mode — no Firebase URL, allow match without deduction
    if not db_url:
        return jsonify({"success": True, "greetingsStack": 50})
    
    path = f"players/{userId}/greetingsStack"
    current_greetings = get_firebase_data(path, db_url)
    if current_greetings is None:
        current_greetings = 50
        
    if current_greetings < 50:
        return jsonify({"error": f"Insufficient greetings: you have {current_greetings}, but need 50 to play."}), 400
        
    new_greetings = current_greetings - 50
    update_firebase_data(f"players/{userId}", {"greetingsStack": new_greetings}, db_url)
    return jsonify({"success": True, "greetingsStack": new_greetings})

@app.route('/api/player/greetings/return', methods=['POST'])
def return_greetings():
    body = request.json or {}
    userId = body.get("userId")
    remaining_deck = body.get("remainingDeck")
    won_reward = body.get("wonReward", False)
    db_url = body.get("dbUrl")
    
    if not userId:
        return jsonify({"error": "Missing userId"}), 400
    if remaining_deck is None:
        return jsonify({"error": "Missing remainingDeck"}), 400
        
    path = f"players/{userId}/greetingsStack"
    current_greetings = get_firebase_data(path, db_url)
    if current_greetings is None:
        current_greetings = 0
        
    new_greetings = current_greetings + int(remaining_deck)
    if won_reward:
        new_greetings += 10
        
    update_firebase_data(f"players/{userId}", {"greetingsStack": new_greetings}, db_url)
    return jsonify({"success": True, "greetingsStack": new_greetings})

# Disable caching of HTML and key assets to force browser updates
@app.after_request
def add_header(response):
    if request.path == '/' or request.path.endswith('.html') or request.path.endswith('.js') or request.path.endswith('.css'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    return response

# Static file serving
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=True)

