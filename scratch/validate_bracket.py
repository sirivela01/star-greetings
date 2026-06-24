def check_brackets(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    lines = content.split('\n')
    in_multiline_comment = False
    for i, line in enumerate(lines, 1):
        in_string = False
        string_char = None
        j = 0
        while j < len(line):
            char = line[j]
            if not in_string:
                if line[j:j+2] == '//':
                    break
                if line[j:j+2] == '/*':
                    in_multiline_comment = True
                    j += 2
                    continue
                if in_multiline_comment:
                    if line[j:j+2] == '*/':
                        in_multiline_comment = False
                        j += 2
                    else:
                        j += 1
                    continue
            if char in ["'", '"', '`']:
                if not in_string:
                    in_string = True
                    string_char = char
                elif string_char == char and (j == 0 or line[j-1] != '\\'):
                    in_string = False
            if not in_string and not in_multiline_comment:
                if char in ['(', '{', '[']:
                    stack.append((char, i, j + 1))
                elif char in [')', '}', ']']:
                    if not stack:
                        print(f"Unmatched closing '{char}' at line {i}, col {j+1}")
                        return False
                    top_char, top_line, top_col = stack.pop()
                    if mapping[char] != top_char:
                        print(f"Mismatched closing '{char}' at line {i}, col {j+1} (expected '{top_char}' from line {top_line})")
                        return False
            j += 1
    if stack:
        for char, line, col in stack:
            print(f"Unmatched opening '{char}' at line {line}, col {col}")
        return False
    print(f"{filepath} is balanced.")
    return True

check_brackets('js/victory-music.js')
check_brackets('js/ui-rendering.js')
check_brackets('js/multiplayer.js')
