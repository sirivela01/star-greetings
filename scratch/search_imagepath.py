import os

def search_files(directory, query):
    for root, dirs, files in os.walk(directory):
        # Exclude node_modules, chrome_user_data, assets, .git, etc.
        if any(ignored in root for ignored in ["node_modules", "chrome_user_data", "assets", ".git", ".agents", "brain"]):
            continue
        for file in files:
            if file.endswith('.js') or file.endswith('.html'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for line_no, line in enumerate(f, 1):
                            if query in line:
                                print(f"{path}:{line_no}: {line.strip()}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    search_files(".", "imagePath")
