import urllib.request
import urllib.parse
import sys

def test():
    prompt = "beautiful anime digital art portrait of Indian actress Kajal Aggarwal, highly detailed, colorful, gorgeous"
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"
    try:
        print(f"Downloading from: {url}")
        urllib.request.urlretrieve(url, "scratch/test_pollinations.png")
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
