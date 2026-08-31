import os
import re
import glob

html_files = glob.glob('d:/Ads Merchants Asia/*.html')
pattern = re.compile(r'<!--Start of Tawk\.to Script-->.*?<!--End of Tawk\.to Script-->', re.DOTALL)
iframe_pattern = re.compile(r'<style>\s*#gkjst5709vp41765729817752,\s*iframe\[src\*="tawk\.to"\]\s*\{.*?</style>', re.DOTALL)

for f in html_files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    new_content = pattern.sub('', content)
    new_content = iframe_pattern.sub('', new_content)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        print(f"Cleaned Tawk from: {os.path.basename(f)}")

print("Tawk cleanup complete.")
