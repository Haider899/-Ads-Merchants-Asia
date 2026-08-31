import os
import glob
import re

html_files = glob.glob('d:/Ads Merchants Asia/*.html')

for filepath in html_files:
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Ensure portal-bridge.js is included
    if 'portal-bridge.js' not in content:
        if '</body>' in content:
            content = content.replace('</body>', '<script src="client/assets/js/portal-bridge.js"></script>\n</body>')
        else:
            content += '\n<script src="client/assets/js/portal-bridge.js"></script>'

    # Fix relative paths and routes
    content = content.replace('dashboard.html', 'dashboard')
    content = content.replace('start.html', 'startData')
    content = content.replace('record.html', 'recordData')
    content = content.replace('deposit.html', 'deposit')
    content = content.replace('withdraw.html', 'withdraw')
    content = content.replace('profile.html', 'profileData')
    content = content.replace('about.html', 'aboutData')
    content = content.replace('levels.html', 'levelsData')
    content = content.replace('license.html', 'license')
    content = content.replace('contract.html', 'contract')
    content = content.replace('faqs.html', 'faqs')
    content = content.replace('contact.html', 'contactData')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filename}")

print("All HTML files injected with portal-bridge.js!")
