import requests
response = requests.head("https://star-greetings.onrender.com/assets/realistic_greetings.png")
print("greetings:", response.status_code)
response2 = requests.head("https://star-greetings.onrender.com/assets/realistic_dice.png")
print("dice:", response2.status_code)
