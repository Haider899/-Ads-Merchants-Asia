import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3000'

def test_everything():
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

    print("1. Checking /editprofileData HTML structure...")
    html = req('/editprofileData')
    assert '<base href="/">' in html
    assert '/client/assets/css/profile.css' in html
    assert 'id="editProfileForm"' in html
    assert 'id="changePasswordForm"' in html
    print(" -> /editprofileData verified with base href and clean stylesheets!")

    print("\n2. Admin metrics & notification counters check...")
    req('/api/admin/login', {'email': 'admin@adsmerchantsasia.com', 'password': 'AdminPass2026!'})
    metrics = req('/api/admin/metrics')
    print(" -> Admin Metrics:")
    print(f"    - Pending Deposits: {metrics['metrics']['pendingDeposits']}")
    print(f"    - Pending Withdrawals: {metrics['metrics']['pendingWithdrawals']}")
    print(f"    - Pending KYCs: {metrics['metrics']['pendingKycs']}")
    print(f"    - Total Users: {metrics['metrics']['totalUsers']}")

    print("\n=== ALL VERIFICATION TESTS PASSED! ===")

if __name__ == '__main__':
    test_everything()
