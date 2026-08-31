import requests
import re
import os

session = requests.Session()
login_url = 'https://adsmerchantsasia.com/dologin'
payload = {'username': 'repofa5484@prorises.com', 'password': 'Password'}
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

res = session.post(login_url, data=payload, headers=headers)
print('Login response code:', res.status_code)

dash_html = res.text

# Find all links
hrefs = set(re.findall(r'href=["\'](.*?)["\']', dash_html))
print("\n--- HREFS in Dashboard ---")
for h in sorted(hrefs):
    print(h)

# Find all onclick / JS functions
scripts = re.findall(r'<script[\s\S]*?</script>', dash_html)
print(f"\nFound {len(scripts)} scripts in dashboard.")

# Let's check the bottom nav bar specifically
bottom_nav = re.findall(r'<div class="navbar-custom[\s\S]*?</div>\s*</div>', dash_html)
if bottom_nav:
    print("\n--- Bottom Nav found ---")
    print(bottom_nav[0][:500])

# Try finding what routes exist for bottom tabs
tab_matches = re.findall(r'(Home|Record|Start|Contact|Profile)[\s\S]*?href=["\'](.*?)["\']', dash_html)
print("\n--- Tab matches ---")
print(tab_matches)

# Let's also check all pages linked in dashboard
os.makedirs('d:/Ads Merchants Asia/scraped_pages', exist_ok=True)
for h in hrefs:
    if h.startswith('http') and 'adsmerchantsasia.com' in h:
        path = h.replace('https://adsmerchantsasia.com/', '').replace('/', '_')
        if not path: path = 'home'
        try:
            r = session.get(h, headers=headers)
            print(f"Fetched {h} -> {r.status_code} ({len(r.text)} bytes)")
            with open(f'd:/Ads Merchants Asia/scraped_pages/{path}.html', 'w', encoding='utf-8') as f:
                f.write(r.text)
        except Exception as e:
            print(f"Error fetching {h}: {e}")
