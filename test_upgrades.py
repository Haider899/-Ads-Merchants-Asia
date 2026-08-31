import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE_URL = 'http://localhost:3000'

def test_flow():
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

    print("--- 1. User Login ---")
    login_res = user_req('/api/auth/login', {'identifier': 'repofa5484@prorises.com', 'password': 'Password'})
    print("User login:", login_res.get('message'))

    print("\n--- 2. User Submits KYC Contract Documents ---")
    kyc_submit = user_req('/api/user/kyc', {
        'name': 'Repofa Verified Merchant',
        'front_id': 'data:image/png;base64,sample_front_id_bytes_mock',
        'back_id': 'data:image/png;base64,sample_back_id_bytes_mock',
        'signature': 'data:image/png;base64,sample_signature_mock',
        'investment_amount': 5000
    })
    print("KYC Submit:", kyc_submit.get('message'))
    kyc_id = kyc_submit['submission']['id']

    print("\n--- 3. User Submits Support Query ---")
    ticket_submit = user_req('/api/user/tickets', {
        'subject': 'Daily task limit upgrade inquiry',
        'message': 'How many orders can I optimize if I upgrade to Gold VIP?'
    })
    print("Ticket Submit:", ticket_submit.get('message'))
    ticket_id = ticket_submit['ticket']['id']

    print("\n--- 4. Admin Logs into Control Center ---")
    admin_login = admin_req('/api/admin/login', {
        'email': 'admin@adsmerchantsasia.com',
        'password': 'AdminPass2026!'
    })
    print("Admin login:", admin_login.get('message'))

    print("\n--- 5. Admin Reviews & Approves KYC ---")
    kyc_action = admin_req('/api/admin/kyc/action', {
        'kycId': kyc_id,
        'action': 'approve'
    })
    print("Admin KYC Action:", kyc_action.get('message'))

    print("\n--- 6. Admin Replies to User Query Ticket ---")
    ticket_reply = admin_req('/api/admin/tickets/reply', {
        'ticketId': ticket_id,
        'reply': 'Gold VIP allows 55 daily orders with 1.20% commission yield!'
    })
    print("Admin Ticket Reply:", ticket_reply.get('message'))

    print("\n--- 7. Admin Resets User Password ---")
    pass_reset = admin_req('/api/admin/users/reset-password', {
        'userId': 'usr_repofa5484',
        'newPassword': 'NewSecurePassword2026!'
    })
    print("Password Reset:", pass_reset.get('message'))

    print("\n--- 8. Verify User Can Login With New Password ---")
    new_login_cj = http.cookiejar.CookieJar()
    new_login_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(new_login_cj))
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({'identifier': 'repofa5484@prorises.com', 'password': 'NewSecurePassword2026!'}).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with new_login_opener.open(req) as resp:
        verify_login = json.loads(resp.read().decode('utf-8'))
    print("Login with new reset password:", verify_login.get('message'))

    # Reset it back to 'Password' for the user's convenience
    admin_req('/api/admin/users/reset-password', {
        'userId': 'usr_repofa5484',
        'newPassword': 'Password'
    })
    print("Restored default password back to 'Password'")

    print("\n=== ALL UPGRADED FEATURES VERIFIED SUCCESSFULLY! ===")

if __name__ == '__main__':
    test_flow()
