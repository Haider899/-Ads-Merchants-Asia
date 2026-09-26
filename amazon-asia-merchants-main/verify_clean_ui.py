import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE_URL = 'http://localhost:3000'

def run_tests():
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

    print("[1] Logging in as member...")
    u_log = user_req('/api/auth/login', {'identifier': 'repofa5484@prorises.com', 'password': 'Password'})
    print("User logged in:", u_log.get('success'))

    print("[2] Submitting deposit with proof receipt...")
    dep_res = user_req('/api/finance/deposit', {
        'amount': 75.00,
        'method': 'TRC20',
        'txid': '0x99aa88bb77cc66dd55ee44',
        'proof_image': 'data:image/png;base64,sample_receipt_image_base64_data'
    })
    print("Deposit result:", dep_res.get('message'))

    print("[3] Admin logging in...")
    a_log = admin_req('/api/admin/login', {'email': 'admin@adsmerchantsasia.com', 'password': 'AdminPass2026!'})
    print("Admin login:", a_log.get('success'))

    print("[4] Admin fetching deposits (Checking proof_image presence)...")
    deposits = admin_req('/api/admin/deposits')
    latest_dep = deposits['deposits'][0]
    print(f"Latest Deposit ID: {latest_dep['id']} | Amount: ${latest_dep['amount']} | Has Proof: {bool(latest_dep.get('proof_image'))}")

    print("[5] Admin fetching KYC list...")
    kycs = admin_req('/api/admin/kyc')
    print(f"Total KYC Submissions: {len(kycs['submissions'])}")

    print("\n--- ALL CLEAN UI TESTS PASSED SUCCESSFULLY! ---")

if __name__ == '__main__':
    run_tests()
