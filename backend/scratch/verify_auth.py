import sys
import os
# Configure stdout to use utf-8 for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient

# Add parent path to import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import get_db, SessionLocal, Base, engine
from app import models

client = TestClient(app)

def test_auth_flow():
    print("=== 開始測試用戶註冊與登入流程 ===")
    
    # Clean users table before test
    db = SessionLocal()
    db.query(models.Merchant).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()
    
    # 1. 測試註冊一個消費者
    print("1. 測試消費者註冊...")
    reg_data = {
        "email": "consumer@example.com",
        "password": "password123",
        "role": "consumer"
    }
    response = client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 201, f"消費者註冊失敗: {response.text}"
    res_json = response.json()
    assert res_json["email"] == "consumer@example.com"
    assert res_json["role"] == "consumer"
    print("✓ 消費者註冊成功！")

    # 2. 測試重複註冊
    print("2. 測試重複註冊相同 Email...")
    response = client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 400, f"預期失敗但成功了: {response.text}"
    print("✓ 重複註冊阻擋成功！")

    # 3. 測試註冊無效角色
    print("3. 測試註冊無效的角色...")
    invalid_reg_data = {
        "email": "invalid@example.com",
        "password": "password123",
        "role": "admin"
    }
    response = client.post("/api/auth/register", json=invalid_reg_data)
    assert response.status_code == 422, f"預期格式驗證錯誤但成功了: {response.text}"
    print("✓ 無效角色驗證阻擋成功！")

    # 4. 測試註冊店家
    print("4. 測試店家註冊與自動生成商家詳情...")
    merchant_reg = {
        "email": "merchant@example.com",
        "password": "password123",
        "role": "merchant"
    }
    response = client.post("/api/auth/register", json=merchant_reg)
    assert response.status_code == 201, f"店家註冊失敗: {response.text}"
    
    # Verify database automatically created a merchant record
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.email == "merchant@example.com").first()
    assert user is not None
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == user.id).first()
    assert merchant is not None
    assert merchant.name == "merchant 的店"
    db.close()
    print("✓ 店家註冊及商家關聯資料自動生成成功！")

    # 5. 測試登入
    print("5. 測試消費者登入...")
    login_data = {
        "username": "consumer@example.com",
        "password": "password123"
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200, f"登入失敗: {response.text}"
    token_json = response.json()
    assert "access_token" in token_json
    assert token_json["token_type"] == "bearer"
    assert token_json["role"] == "consumer"
    print("✓ 消費者登入成功！Token:", token_json["access_token"][:15] + "...")

    # 6. 測試密碼錯誤登入
    print("6. 測試輸入錯誤密碼登入...")
    wrong_login_data = {
        "username": "consumer@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/auth/login", data=wrong_login_data)
    assert response.status_code == 401, f"預期登入失敗但成功了: {response.text}"
    print("✓ 密碼錯誤登入阻擋成功！")

    print("\n=== 所有驗證測試皆已成功通過！ ===")

if __name__ == "__main__":
    test_auth_flow()
