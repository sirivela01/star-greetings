import requests

url = "http://127.0.0.1:8080/api/player/greetings?userId=test_user"

try:
    res = requests.get(url)
    print("Status code:", res.status_code)
    try:
        print("Response JSON:", res.json())
    except:
        print("Response Text (truncated):", res.text[:200])
except Exception as e:
    print("Error:", e)
