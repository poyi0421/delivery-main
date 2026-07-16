import sys
import os
from fastapi.testclient import TestClient

# Configure stdout for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def test_menu_flow():
    print("=== 開始測試商家菜單管理與瀏覽 API ===")
    
    # 1. 重設資料庫以獲得乾淨環境
    db = SessionLocal()
    db.query(models.OrderItem).delete()
    db.query(models.Order).delete()
    db.query(models.Product).delete()
    db.query(models.Merchant).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()
    
    # 2. 註冊一個消費者與一個商家，並取得 token
    print("1. 註冊並登入測試帳號...")
    # 註冊消費者
    client.post("/api/auth/register", json={"email": "c@example.com", "password": "password123", "role": "consumer"})
    c_login = client.post("/api/auth/login", data={"username": "c@example.com", "password": "password123"})
    c_token = c_login.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}
    
    # 註冊商家
    client.post("/api/auth/register", json={"email": "m@example.com", "password": "password123", "role": "merchant"})
    m_login = client.post("/api/auth/login", data={"username": "m@example.com", "password": "password123"})
    m_token = m_login.json()["access_token"]
    m_headers = {"Authorization": f"Bearer {m_token}"}
    
    print("✓ 帳號註冊與登入成功！")
    
    # 3. 測試權限控管：消費者無法新增商品
    print("2. 測試消費者越權新增商品...")
    bad_product = {"name": "小偷牛肉麵", "price": 100}
    response = client.post("/api/merchants/products", json=bad_product, headers=c_headers)
    assert response.status_code == 403, f"消費者預期無法新增商品但成功了: {response.text}"
    print("✓ 消費者越權新增阻擋成功！")
    
    # 4. 商家新增商品
    print("3. 商家新增餐點商品...")
    prod1 = {"name": "招牌牛肉麵", "description": "紅燒湯頭，牛肉軟嫩", "price": 150}
    response = client.post("/api/merchants/products", json=prod1, headers=m_headers)
    assert response.status_code == 201, f"商品新增失敗: {response.text}"
    p1_id = response.json()["id"]
    m_id = response.json()["merchant_id"]
    print(f"✓ 商品「招牌牛肉麵」(ID: {p1_id}) 新增成功！")
    
    # 5. 測試新增負數價格商品
    print("4. 測試新增負數價格商品...")
    invalid_product = {"name": "免費牛肉麵", "price": -5}
    response = client.post("/api/merchants/products", json=invalid_product, headers=m_headers)
    assert response.status_code == 422, f"預期價格驗證失敗但成功了: {response.text}"
    print("✓ 負數價格驗證阻擋成功！")
    
    # 6. 公開瀏覽商家列表
    print("5. 測試公開瀏覽商家列表...")
    response = client.get("/api/merchants/")
    assert response.status_code == 200
    merchants = response.json()
    assert len(merchants) == 1
    assert merchants[0]["name"] == "m 的店"
    print("✓ 商家列表瀏覽成功！")
    
    # 7. 公開瀏覽特定商家選單
    print("6. 測試公開瀏覽特定商家菜單...")
    response = client.get(f"/api/merchants/{m_id}/menu")
    assert response.status_code == 200
    menu = response.json()
    assert len(menu) == 1
    assert menu[0]["name"] == "招牌牛肉麵"
    print("✓ 商家菜單瀏覽成功！")
    
    # 8. 商家新增第二樣商品並編輯它
    print("7. 測試商家編輯商品功能...")
    prod2 = {"name": "滷肉飯", "price": 40}
    response = client.post("/api/merchants/products", json=prod2, headers=m_headers)
    p2_id = response.json()["id"]
    
    # 編輯餐點
    update_data = {"price": 45, "description": "黃金比例手工切肉"}
    response = client.put(f"/api/merchants/products/{p2_id}", json=update_data, headers=m_headers)
    assert response.status_code == 200
    assert response.json()["price"] == 45
    assert response.json()["description"] == "黃金比例手工切肉"
    print("✓ 商品編輯更新成功！")
    
    # 9. 測試消費者越權修改商品
    print("8. 測試消費者越權修改商品...")
    response = client.put(f"/api/merchants/products/{p2_id}", json={"price": 10}, headers=c_headers)
    assert response.status_code == 403
    print("✓ 消費者越權修改阻擋成功！")
    
    # 10. 測試商家軟刪除下架商品
    print("9. 測試商家下架（軟刪除）商品...")
    response = client.delete(f"/api/merchants/products/{p2_id}", headers=m_headers)
    assert response.status_code == 200
    assert response.json()["is_available"] == False
    print("✓ 商品軟下架設定成功！")
    
    # 11. 驗證下架商品不會出現在消費者菜單列表中
    print("10. 驗證下架商品不會出現在菜單瀏覽中...")
    response = client.get(f"/api/merchants/{m_id}/menu")
    menu = response.json()
    assert len(menu) == 1  # 應該只剩下招牌牛肉麵，滷肉飯已被軟下架
    assert menu[0]["name"] == "招牌牛肉麵"
    print("✓ 下架商品成功隱藏！")
    
    # 12. 驗證店家可以用 /my/products 看到已下架的商品
    print("11. 驗證店家查詢自家完整商品清單（含下架商品）...")
    response = client.get("/api/merchants/my/products", headers=m_headers)
    assert response.status_code == 200
    my_products = response.json()
    assert len(my_products) == 2  # 招牌牛肉麵 + 已下架的滷肉飯
    names = [p["name"] for p in my_products]
    assert "招牌牛肉麵" in names
    assert "滷肉飯" in names
    print("✓ 店家查詢自家完整商品成功！")

    # 13. 驗證店家取得自家 profile
    print("12. 測試店家取得與編輯自家商店資訊...")
    response = client.get("/api/merchants/my/profile", headers=m_headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["name"] == "m 的店"
    
    # 編輯 profile
    response = client.put("/api/merchants/my/profile", json={"name": "m 的牛肉麵老店", "description": "三十年老字號"}, headers=m_headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["name"] == "m 的牛肉麵老店"
    assert profile["description"] == "三十年老字號"
    
    # 驗證消費者瀏覽商家列表時，店名已變更
    response = client.get("/api/merchants/")
    assert response.status_code == 200
    merchants = response.json()
    assert merchants[0]["name"] == "m 的牛肉麵老店"
    print("✓ 店家資訊取得與更新成功！")
    
    print("\n=== 所有商家菜單與瀏覽測試已順利通過！ ===")

if __name__ == "__main__":
    test_menu_flow()
