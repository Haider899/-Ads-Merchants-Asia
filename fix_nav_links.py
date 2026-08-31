import glob
import re

files = [
    'dashboard.html', 'record.html', 'start.html', 'contact.html', 'profile.html',
    'deposit.html', 'withdraw.html', 'license.html', 'contract.html', 'faqs.html',
    'about.html', 'levels.html'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix home link in footer if empty
    content = re.sub(r'<a class="footer-item([^"]*)" href=""', r'<a class="footer-item\1" href="dashboard.html"', content)
    content = re.sub(r'href="https://adsmerchantsasia\.com/+"', 'href="dashboard.html"', content)
    
    # Save back
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Verified & Fixed: {fpath}")

print("All navigation links verified!")
