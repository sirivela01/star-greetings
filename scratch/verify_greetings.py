import requests
import json
import random
import time

base_url = "http://127.0.0.1:8080"
# Use a random test user to avoid collision with existing data
user_id = f"test_verify_user_{random.randint(1000, 9999)}"
db_url = "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app"

def run_tests():
    print(f"Running Greetings Stack API Verification Tests for user '{user_id}'...")
    
    # 1. Fetch greetings (should initialize to 30)
    print("\n--- Test 1: Get Greetings (Initialization) ---")
    res = requests.get(f"{base_url}/api/player/greetings?userId={user_id}&dbUrl={db_url}")
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["greetingsStack"] == 30
    
    time.sleep(0.5)

    # 2. Try start-match with deduction (should deduct 30 and return 0)
    print("\n--- Test 2: Start Match Deduction ---")
    res = requests.post(f"{base_url}/api/player/greetings/start-match", json={"userId": user_id, "dbUrl": db_url})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["greetingsStack"] == 0
    
    time.sleep(0.5)

    # 3. Try start-match again (should fail with 400 since balance is 0)
    print("\n--- Test 3: Start Match Deduction (Insufficient) ---")
    res = requests.post(f"{base_url}/api/player/greetings/start-match", json={"userId": user_id, "dbUrl": db_url})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 400
    assert "Insufficient greetings" in res.json()["error"]
    
    time.sleep(0.5)

    # 4. Return remaining deck after losing (e.g. 20 cards remaining, lost reward)
    print("\n--- Test 4: Return Greetings (Loss) ---")
    res = requests.post(f"{base_url}/api/player/greetings/return", json={"userId": user_id, "remainingDeck": 20, "wonReward": False, "dbUrl": db_url})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["greetingsStack"] == 20
    
    time.sleep(1.0) # Pause to let Firebase persist the write

    # 5. Return remaining deck after winning (e.g. 30 cards remaining, won reward +10)
    # 20 + 30 + 10 = 60
    print("\n--- Test 5: Return Greetings (Win) ---")
    res = requests.post(f"{base_url}/api/player/greetings/return", json={"userId": user_id, "remainingDeck": 30, "wonReward": True, "dbUrl": db_url})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["greetingsStack"] == 60

    print("\nAll Greetings Stack API verification tests PASSED successfully!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\nTest verification failed: {e}")
