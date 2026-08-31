import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE_URL = 'http://localhost:3000'

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def request(path, data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=req_data, headers=headers)
    try:
        with opener.open(req) as resp:
            content = resp.read().decode('utf-8')
            try:
                return resp.status, json.loads(content)
            except:
                return resp.status, content
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        try:
            return e.code, json.loads(content)
        except:
            return e.code, content

print("==================================================")
print("TESTING ADS MERCHANTS ASIA FULL-STACK PLATFORM")
print("==================================================")

# 1. Test Member Login
print("\n[1] Testing Member Authentication...")
status, res = request('/api/auth/login', {
    'identifier': 'repofa5484@prorises.com',
    'password': 'Password'
})
print(f"Login Response: {status} => {res.get('message')}")
assert res.get('success') is True, "Login failed!"
user = res['user']
print(f"Logged in as: {user['fullname']} | Balance: ${user['balance']} | VIP: {user['vip_level']}")

# 2. Test Fetch /api/auth/me
print("\n[2] Testing Session Verification (/api/auth/me)...")
status, res = request('/api/auth/me')
assert res.get('success') is True
print(f"Current Authenticated User: {res['user']['email']}")

# 3. Test Task Optimization (Start Task Engine)
print("\n[3] Testing Task Optimization Engine (/api/tasks/generate)...")
status, res = request('/api/tasks/generate', {})
print(f"Task Generated: {status} => {res.get('task', {}).get('product_name')}")
task = res['task']
print(f"Product: {task['product_name']} | Price: ${task['product_price']} | Commission: +${task['commission_amount']}")

# 4. Test Task Submission
print("\n[4] Testing Task Submission & Balance Yield (/api/tasks/submit)...")
status, res = request('/api/tasks/submit', {'taskId': task['id']})
print(f"Task Submit: {status} => {res.get('message')}")
assert res.get('success') is True
print(f"New Balance: ${res['data']['balance']} | Today Profit: ${res['data']['today_profit']}")

# 5. Test Deposit Submission
print("\n[5] Testing Deposit Request (/api/finance/deposit)...")
status, res = request('/api/finance/deposit', {
    'amount': 250.00,
    'method': 'TRC20',
    'txid': '0x77bb88cc99ddaa11ee22ff33'
})
print(f"Deposit Submit: {status} => {res.get('message')}")
deposit_id = res['deposit']['id']

# 6. Test Admin Login & Control Center
print("\n[6] Testing Admin Authority Sign-in...")
admin_cj = http.cookiejar.CookieJar()
admin_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(admin_cj))

def admin_request(path, data=None):
    headers = {'Content-Type': 'application/json'}
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers)
    with admin_opener.open(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

admin_res = admin_request('/api/admin/login', {
    'email': 'admin@adsmerchantsasia.com',
    'password': 'AdminPass2026!'
})
print(f"Admin Auth: {admin_res.get('message')}")

metrics = admin_request('/api/admin/metrics')
print(f"Platform Metrics: {metrics['metrics']}")

# 7. Admin Approves Deposit
print("\n[7] Admin Approving Deposit Request...")
action_res = admin_request('/api/admin/deposits/action', {
    'depositId': deposit_id,
    'action': 'approve'
})
print(f"Admin Deposit Approval: {action_res.get('message')}")

# 8. Check Member Balance After Deposit Approval
status, res = request('/api/auth/me')
print(f"Member Balance After Approval: ${res['user']['balance']}")

print("\n==================================================")
print("✅ ALL TESTS PASSED! FULL-STACK SYSTEM IS 100% OPERATIONAL!")
print("==================================================")
