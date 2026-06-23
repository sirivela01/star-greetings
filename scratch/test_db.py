import requests

db_url = "https://star-greetings-default-rtdb.asia-southeast1.firebasedatabase.app"
user_id = "test_verify_user_1941"

def test():
    # Read the parent node
    parent = requests.get(f"{db_url}/players/{user_id}.json").json()
    print("Parent node in Firebase:", parent)

    # Read the greetingsStack node
    stack = requests.get(f"{db_url}/players/{user_id}/greetingsStack.json").json()
    print("GreetingsStack node in Firebase:", stack)

test()
