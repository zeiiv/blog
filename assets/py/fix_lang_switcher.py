import os
import sys

SITE_DIR = '_site'

# Enable debug printing if '--debug' is passed as a command-line argument
DEBUG = '--debug' in sys.argv

def debug_print(*args, **kwargs):
    if DEBUG:
        print(*args, **kwargs)

def get_lang_and_switch_url(rel_path):
    rel_path = rel_path.replace(os.sep, '/')
    if rel_path.startswith('he/'):
        switch_url = '/' + rel_path[3:]
        debug_print(f"Detected Hebrew page: {rel_path} -> English URL: {switch_url.replace('index.html', '')}")
        return 'he', switch_url.replace('index.html', '')
    else:
        switch_url = '/he/' + rel_path
        debug_print(f"Detected English page: {rel_path} -> Hebrew URL: {switch_url.replace('index.html', '')}")
        return 'en', switch_url.replace('index.html', '')

def process_html_file(full_path, rel_path):
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    lang, switch_url = get_lang_and_switch_url(rel_path)
    if lang == 'he':
        if 'LANG_SWITCH_EN' in content:
            debug_print(f"Replacing LANG_SWITCH_EN in {rel_path} with {switch_url}")
        content = content.replace('LANG_SWITCH_EN', switch_url)
    else:
        if 'LANG_SWITCH_HE' in content:
            debug_print(f"Replacing LANG_SWITCH_HE in {rel_path} with {switch_url}")
        content = content.replace('LANG_SWITCH_HE', switch_url)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    if DEBUG:
        print("Starting language switcher fix script...")
    found = False
    for root, dirs, files in os.walk(SITE_DIR):
        for file in files:
            if file.endswith('.html'):
                found = True
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, SITE_DIR)
                process_html_file(full_path, rel_path)
    if not found and DEBUG:
        print("No HTML files found in _site directory.")

if __name__ == '__main__':
    main()
