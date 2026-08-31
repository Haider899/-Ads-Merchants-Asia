import os
import re

pages_map = {
    'dashboard': 'dashboard.html',
    'recordData': 'record.html',
    'startData': 'start.html',
    'contactData': 'contact.html',
    'profileData': 'profile.html',
    'deposit': 'deposit.html',
    'withdraw': 'withdraw.html',
    'license': 'license.html',
    'contract': 'contract.html',
    'faqs': 'faqs.html',
    'aboutData': 'about.html',
    'levelsData': 'levels.html',
}

def clean_html(html):
    # Fix all absolute domain URLs
    html = re.sub(r'https?://adsmerchantsasia\.com/+', '', html)
    html = re.sub(r'https?://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/6\.5\.1/css/all\.min\.css', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', html)
    
    # Fix corrupted prefixes
    html = html.replace('dashboard.htmlclientassets/', 'client/assets/')
    html = html.replace('dashboard.htmlassets/', 'assets/')
    html = html.replace('dashboard.htmlclient/assets/', 'client/assets/')
    html = html.replace('clientassets/', 'client/assets/')

    # Fix relative paths
    html = html.replace('href="/client/assets/', 'href="client/assets/')
    html = html.replace('src="/client/assets/', 'src="client/assets/')
    html = html.replace('href="/assets/', 'href="assets/')
    html = html.replace('src="/assets/', 'src="assets/')

    # Fix routes in hrefs
    html = re.sub(r'href=["\']/?dashboard(\.html)?["\']', 'href="dashboard.html"', html)
    html = re.sub(r'href=["\']/?recordData["\']', 'href="record.html"', html)
    html = re.sub(r'href=["\']/?startData["\']', 'href="start.html"', html)
    html = re.sub(r'href=["\']/?contactData["\']', 'href="contact.html"', html)
    html = re.sub(r'href=["\']/?profileData["\']', 'href="profile.html"', html)
    html = re.sub(r'href=["\']/?deposit["\']', 'href="deposit.html"', html)
    html = re.sub(r'href=["\']/?withdraw["\']', 'href="withdraw.html"', html)
    html = re.sub(r'href=["\']/?license["\']', 'href="license.html"', html)
    html = re.sub(r'href=["\']/?contract["\']', 'href="contract.html"', html)
    html = re.sub(r'href=["\']/?faqs["\']', 'href="faqs.html"', html)
    html = re.sub(r'href=["\']/?aboutData["\']', 'href="about.html"', html)
    html = re.sub(r'href=["\']/?levelsData["\']', 'href="levels.html"', html)
    html = re.sub(r'href=["\']/?signout["\']', 'href="login.html"', html)
    html = re.sub(r'href=["\']/?Login["\']', 'href="login.html"', html)
    html = re.sub(r'href=["\']/?Register["\']', 'href="register.html"', html)
    html = re.sub(r'href=["\']/?forgotpass["\']', 'href="forgotpass.html"', html)

    # Ensure fontawesome is loaded
    if 'font-awesome' not in html and 'all.min.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n</head>')

    return html

for src_name, dest_name in pages_map.items():
    src_file = f'd:/Ads Merchants Asia/scraped_pages/{src_name}.html'
    if os.path.exists(src_file):
        with open(src_file, 'r', encoding='utf-8') as f:
            content = f.read()
        cleaned = clean_html(content)
        with open(f'd:/Ads Merchants Asia/{dest_name}', 'w', encoding='utf-8') as f:
            f.write(cleaned)
        print(f"Generated: {dest_name}")

print("All 12 portal pages updated with clean local paths!")
