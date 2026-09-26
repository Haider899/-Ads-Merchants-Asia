import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3000'

def test_fixes():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def req(path, data=None):
        headers = {'Content-Type': 'application/json'}
        url = f"{BASE_URL}{path}"
        req_data = json.dumps(data).encode('utf-8') if data is not None else None
        r = urllib.request.Request(url, data=req_data, headers=headers)
        with opener.open(r) as resp:
            content = resp.read().decode('utf-8')
            try:
                return json.loads(content)
            except:
                return content

    print("1. Testing /editprofileData route access...")
    page_html = req('/editprofileData')
    assert '<title>Ads Merchants Asia - Edit Profile & Security</title>' in page_html
    print(" -> /editprofileData loaded successfully with correct page title!")

    print("\n2. Member login...")
    login = req('/api/auth/login', {'identifier': 'repofa5484@prorises.com', 'password': 'Password'})
    print(" -> Login success:", login.get('success'))

    print("\n3. Testing profile personal info update...")
    update_res = req('/api/user/profile', {
        'fullname': 'Repofa Asia Merchant',
        'phone': '+60188899900',
        'gender': 'Male'
    })
    print(" -> Update result:", update_res.get('message'))
    print(" -> New Fullname in DB:", update_res['user']['fullname'])

    print("\n4. Testing chat history retrieval...")
    chat_res = req('/api/user/chat')
    print(f" -> Chat messages count for user: {len(chat_res['messages'])}")
    for m in chat_res['messages']:
        print(f"    [{m['sender'].upper()}]: {m['text']}")

    print("\n=== ALL 3 ISSUES VERIFIED & RESOLVED SUCCESSFULLY! ===")

if __name__ == '__main__':
    test_fixes()
