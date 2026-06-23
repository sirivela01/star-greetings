def check_brackets(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # simple check ignoring strings and comments (basic approximation)
        in_string = False
        string_char = None
        in_comment = False
        in_multiline_comment = False
        
        j = 0
        while j < len(line):
            char = line[j]
            
            # handle comments
            if not in_string:
                if line[j:j+2] == '//':
                    break # rest of line is comment
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
            
            # handle strings
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
                        print(f"Mismatched closing '{char}' at line {i}, col {j+1} (expected closing for '{top_char}' from line {top_line}, col {top_col})")
                        return False
            j += 1
            
    if stack:
        for char, line, col in stack:
            print(f"Unmatched opening '{char}' at line {line}, col {col}")
        return False
    
    print(f"{filepath} is balanced.")
    return True

print("Checking styles.css:")
check_brackets('styles.css')
