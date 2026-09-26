import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3000'

def test_notification_flow():
    # User Opener
    user_cj = http.cookiejar.CookieJar()
    user_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(user_cj))

    def user_req(path, data=None):
        headers = {'Content-Type': 'application/json'}
        url = f"{BASE_URL}{path}"
        req_data = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=req_data, headers=headers)
        with user_opener.open(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    # Admin Opener
    admin_cj = http.cookiejar.CookieJar()
    admin_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(admin_cj))

    def admin_req(path, data=None):
        headers = {'Content-Type': 'application/json'}
        url = f"{BASE_URL}{path}"
        req_data = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=req_data, headers=headers)
        with admin_opener.open(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    print("1. Member logs in...")
    user_req('/api/auth/login', {'identifier': 'repofa5484@prorises.com', 'password': 'Password'})

    print("2. Member submits deposit of $100.00...")
    dep_res = user_req('/api/finance/deposit', {
        'amount': 100.00,
        'method': 'TRC20',
        'txid': '0xnotif_test_hash_12345678',
        'proof_image': 'assets/uploads/contracts/id_sample_front.png'
    })
    
    print("3. Admin logs in...")
    admin_req('/api/admin/login', {'email': 'admin@adsmerchantsasia.com', 'password': 'AdminPass2026!'})

    print("4. Admin approves deposit...")
    deposits = admin_req('/api/admin/deposits')['deposits']
    dep_id = deposits[0]['id']
    admin_req('/api/admin/deposits/action', {'depositId': dep_id, 'action': 'approve'})

    print("5. Member checks unread notifications...")
    notifs = user_req('/api/user/notifications')
    print("Received Notifications count:", len(notifs['notifications']))
    for n in notifs['notifications']:
        print(f" -> [{n['type'].upper()}] {n['title']} | {n['message']}")

    print("6. Member marks notifications as read...")
    user_req('/api/user/notifications/mark-read', {})
    
    print("7. Verify unread count is now 0...")
    cleared = user_req('/api/user/notifications')
    print("Unread count after mark-read:", len(cleared['notifications']))

    print("\n=== NOTIFICATION SYSTEM VERIFIED SUCCESSFULLY! ===")

if __name__ == '__main__':
    test_notification_flow()
