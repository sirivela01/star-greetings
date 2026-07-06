import os
import requests

def download_jar():
    url = "https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar"
    target_dir = os.path.join("android", "gradle", "wrapper")
    target_file = os.path.join(target_dir, "gradle-wrapper.jar")

    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    print(f"Downloading gradle-wrapper.jar from {url}...")
    response = requests.get(url, stream=True, timeout=30)
    if response.status_code == 200:
        with open(target_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=4096):
                f.write(chunk)
        print("Successfully downloaded gradle-wrapper.jar!")
    else:
        print(f"Failed to download. Status code: {response.status_code}")

if __name__ == "__main__":
    download_jar()
