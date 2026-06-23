from gradio_client import Client
import os

def test():
    space_name = "black-forest-labs/FLUX.1-schnell"
    print(f"Connecting to: {space_name}...")
    try:
        client = Client(space_name)
        print("Success! Connected to Gradio Space.")
        # View API
        client.view_api()
    except Exception as e:
        print(f"Error connecting: {e}")

if __name__ == "__main__":
    test()
