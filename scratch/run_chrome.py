import os
import subprocess
import time

def find_chrome():
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

chrome_path = find_chrome()
if not chrome_path:
    print("Chrome not found on this system!")
    exit(1)

print(f"Found Chrome at: {chrome_path}")

# Run Chrome headlessly and log console messages to a file
# We use --enable-logging --v=1 which writes console logs to chrome_debug.log in user data directory
user_data_dir = os.path.abspath("chrome_user_data")
log_file = os.path.join(user_data_dir, "chrome_debug.log")

if os.path.exists(log_file):
    os.remove(log_file)

cmd = [
    chrome_path,
    "--headless",
    "--disable-gpu",
    "--enable-logging",
    f"--user-data-dir={user_data_dir}",
    "file:///c:/Users/syash/Downloads/python/star-greetings/index.html?test_online"
]

print("Launching Chrome headlessly...")
process = subprocess.Popen(cmd)
time.sleep(18)  # Wait 18 seconds for automation to login, click and try to create room
process.terminate()

# Read the debug log file
if os.path.exists(log_file):
    print("\n--- Chrome Debug Logs ---")
    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
        logs = f.read()
    
    # Filter logs for javascript console outputs (usually contains CONSOLE or error info)
    for line in logs.split('\n'):
        if 'console' in line.lower() or 'error' in line.lower() or 'exception' in line.lower() or 'js' in line.lower():
            print(line)
else:
    print(f"Log file not found at {log_file}!")
