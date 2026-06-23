import re

filepath = 'js/multiplayer.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define the getMyUid() helper method in MultiplayerManager.
# Let's search for showToast definition and place it right after it or in constructor.
# Let's check constructor ending (around line 28):
# We can insert getMyUid() method before showToast.
constructor_end_pattern = r"(\s+this\.initFirebase\(\);\s+\}\n)"
replacement = r"\1\n  getMyUid() {\n    if (!this.currentUser) return null;\n    const uid = this.currentUser.uid || (firebase.auth && firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);\n    if (uid) return uid;\n    return \"guest_\" + this.currentUser.username;\n  }\n"

new_content = re.sub(constructor_end_pattern, replacement, content)

# 2. Replace all inline patterns of finding myUid with this.getMyUid()
# The patterns are:
# Pattern A: `const myUid = this.currentUser ? (this.currentUser.uid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null)) : null;`
# Pattern B: `const myUid = this.currentUser.uid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);`
# Pattern C: `const myUid = localUser ? (localUser.uid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null)) : null;`

pattern_a = r"const myUid = this\.currentUser \? \(this\.currentUser\.uid \|\| \(firebase\.auth\(\)\.currentUser \? firebase\.auth\(\)\.currentUser\.uid : null\)\) : null;"
new_content = re.sub(pattern_a, "const myUid = this.getMyUid();", new_content)

pattern_b = r"const myUid = this\.currentUser\.uid \|\| \(firebase\.auth\(\)\.currentUser \? firebase\.auth\(\)\.currentUser\.uid : null\);"
new_content = re.sub(pattern_b, "const myUid = this.getMyUid();", new_content)

pattern_c = r"const myUid = localUser \? \(localUser\.uid \|\| \(firebase\.auth\(\)\.currentUser \? firebase\.auth\(\)\.currentUser\.uid : null\)\) : null;"
new_content = re.sub(pattern_c, "const myUid = this.getMyUid();", new_content)

# Let's write the updated content back to the file
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Modification complete.")
