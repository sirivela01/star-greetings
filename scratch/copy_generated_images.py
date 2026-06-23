import shutil
import sys
import os

def copy_image(source_path, target_id):
    target_dir = r"c:\Users\syash\Downloads\python\star-greetings\assets\stars"
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, f"{target_id}.png")
    shutil.copy2(source_path, target_path)
    print(f"Copied {source_path} to {target_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python copy_image.py <source_path> <target_id>")
        sys.exit(1)
    copy_image(sys.argv[1], sys.argv[2])
