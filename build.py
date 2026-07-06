import os
import shutil

def build():
    dest = "www"
    if os.path.exists(dest):
        shutil.rmtree(dest)
    os.makedirs(dest)

    # Copy files
    files_to_copy = ["index.html", "styles.css"]
    for f in files_to_copy:
        if os.path.exists(f):
            shutil.copy(f, os.path.join(dest, f))

    # Copy directories
    dirs_to_copy = ["assets", "js", "barakatta"]
    for d in dirs_to_copy:
        if os.path.exists(d):
            shutil.copytree(d, os.path.join(dest, d))
    
    print("Build complete! Clean assets copied to 'www' folder.")

if __name__ == "__main__":
    build()
