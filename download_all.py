import requests
import re
import os
from urllib.parse import urljoin, urlparse

session = requests.Session()
login_url = 'https://adsmerchantsasia.com/dologin'
payload = {'username': 'repofa5484@prorises.com', 'password': 'Password'}
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

res = session.post(login_url, data=payload, headers=headers)
print('Login response code:', res.status_code)
print('Final URL after login:', res.url)

routes = {
    'dashboard': 'https://adsmerchantsasia.com/dashboard',
    'recordData': 'https://adsmerchantsasia.com/recordData',
    'startData': 'https://adsmerchantsasia.com/startData',
    'contactData': 'https://adsmerchantsasia.com/contactData',
    'profileData': 'https://adsmerchantsasia.com/profileData',
    'deposit': 'https://adsmerchantsasia.com/deposit',
    'withdraw': 'https://adsmerchantsasia.com/withdraw',
    'license': 'https://adsmerchantsasia.com/license',
    'contract': 'https://adsmerchantsasia.com/contract',
    'faqs': 'https://adsmerchantsasia.com/faqs',
    'aboutData': 'https://adsmerchantsasia.com/aboutData',
    'levelsData': 'https://adsmerchantsasia.com/levelsData'
}

os.makedirs('d:/Ads Merchants Asia/scraped_pages', exist_ok=True)
all_html = {}

for name, url in routes.items():
    r = session.get(url, headers=headers)
    print(f"Fetched {name} ({url}) -> status {r.status_code}, len: {len(r.text)}")
    all_html[name] = r.text
    with open(f'd:/Ads Merchants Asia/scraped_pages/{name}.html', 'w', encoding='utf-8') as f:
        f.write(r.text)

# Collect all images, css, js across all pages
assets = set()
for html in all_html.values():
    # Images
    srcs = re.findall(r'src=["\'](.*?)["\']', html)
    hrefs = re.findall(r'href=["\'](.*?)["\']', html)
    for u in srcs + hrefs:
        if u.endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.css', '.js', '.woff', '.woff2', '.ttf')):
            full_url = urljoin('https://adsmerchantsasia.com/', u)
            assets.add(full_url)

print(f"\nFound {len(assets)} assets to download.")

os.makedirs('d:/Ads Merchants Asia/assets/downloaded', exist_ok=True)
for a in sorted(assets):
    try:
        parsed = urlparse(a)
        local_rel = parsed.path.lstrip('/')
        if not local_rel:
            continue
        local_path = os.path.join('d:/Ads Merchants Asia', local_rel)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        ar = session.get(a, headers=headers)
        if ar.status_code == 200:
            with open(local_path, 'wb') as af:
                af.write(ar.content)
            print(f"Downloaded asset: {local_rel} ({len(ar.content)} bytes)")
        else:
            print(f"Failed {a} -> {ar.status_code}")
    except Exception as e:
        print(f"Error downloading asset {a}: {e}")
