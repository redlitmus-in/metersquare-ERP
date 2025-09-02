#!/usr/bin/env python3
"""
Test script for role-based login flow
Tests each workflow role can login with OTP
"""

import requests
import json
import sys
import time

# Configuration
API_BASE_URL = "http://localhost:5000"  # Adjust if different
TEST_USERS = [
    {'email': 'site.supervisor@metersquare.com', 'role': 'siteSupervisor'},
    {'email': 'mep.supervisor@metersquare.com', 'role': 'mepSupervisor'},
    {'email': 'procurement@metersquare.com', 'role': 'procurement'},
    {'email': 'pm@metersquare.com', 'role': 'projectManager'},
    {'email': 'design@metersquare.com', 'role': 'design'},
    {'email': 'estimation@metersquare.com', 'role': 'estimation'},
    {'email': 'accounts@metersquare.com', 'role': 'accounts'},
    {'email': 'director@metersquare.com', 'role': 'technicalDirector'}
]

def test_login(email, expected_role):
    """Test login flow for a user"""
    print(f"\n{'='*60}")
    print(f"Testing login for: {email}")
    print(f"Expected role: {expected_role}")
    print('='*60)
    
    # Step 1: Send OTP
    print("\n1. Sending OTP request...")
    response = requests.post(f"{API_BASE_URL}/login", 
                            json={'email': email},
                            headers={'Content-Type': 'application/json'})
    
    if response.status_code != 200:
        print(f"❌ Failed to send OTP: {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    data = response.json()
    print(f"✅ OTP sent successfully")
    print(f"   Message: {data.get('message', '')}")
    
    # Get OTP (in dev mode it's returned in response)
    otp = data.get('otp')
    if not otp:
        print("⚠️  OTP not found in response (production mode)")
        print("   Please check email for OTP and enter manually:")
        otp = input("   Enter OTP: ")
    else:
        print(f"   Development OTP: {otp}")
    
    # Step 2: Verify OTP
    print("\n2. Verifying OTP...")
    response = requests.post(f"{API_BASE_URL}/verification_otp",
                            json={'email': email, 'otp': str(otp)},
                            headers={'Content-Type': 'application/json'})
    
    if response.status_code != 200:
        print(f"❌ Failed to verify OTP: {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    data = response.json()
    user = data.get('user', {})
    
    print(f"✅ Login successful!")
    print(f"   User ID: {user.get('user_id')}")
    print(f"   Name: {user.get('full_name')}")
    print(f"   Role: {user.get('role')}")
    print(f"   Department: {user.get('department')}")
    print(f"   Permissions: {len(user.get('permissions', []))} permissions")
    
    # Verify role matches
    if user.get('role') != expected_role:
        print(f"⚠️  Role mismatch! Expected: {expected_role}, Got: {user.get('role')}")
        return False
    
    # Step 3: Test authenticated endpoint
    print("\n3. Testing authenticated access...")
    token = data.get('access_token')
    response = requests.get(f"{API_BASE_URL}/self",
                           headers={'Authorization': f'Bearer {token}'})
    
    if response.status_code == 200:
        print(f"✅ Authenticated access successful")
        return True
    else:
        print(f"❌ Failed authenticated access: {response.status_code}")
        return False

def main():
    """Main test function"""
    print("\n" + "="*60)
    print("MeterSquare ERP - Role-Based Login Test")
    print("="*60)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_BASE_URL}/api/roles")
        if response.status_code != 200:
            print(f"⚠️  API may not be configured correctly")
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to API at {API_BASE_URL}")
        print("   Please ensure the backend server is running")
        return
    
    # Test each user
    results = []
    for user in TEST_USERS:
        try:
            success = test_login(user['email'], user['role'])
            results.append({
                'email': user['email'],
                'role': user['role'],
                'success': success
            })
            time.sleep(1)  # Small delay between tests
        except Exception as e:
            print(f"❌ Error testing {user['email']}: {str(e)}")
            results.append({
                'email': user['email'],
                'role': user['role'],
                'success': False
            })
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    success_count = sum(1 for r in results if r['success'])
    total_count = len(results)
    
    for result in results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['role']:20} - {result['email']}")
    
    print(f"\nTotal: {success_count}/{total_count} successful")
    
    if success_count == total_count:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total_count - success_count} tests failed")

if __name__ == "__main__":
    main()