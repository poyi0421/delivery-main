import sys
import os
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Configure stdout for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def test_orders_flow():
    print("=== 開始測試訂單與自動派單系統 API ===")
    
    # 1. 重設資料庫
    db = SessionLocal()
    db.query(models.OrderItem).delete()
    db.query(models.Order).delete()
    db.query(models.Product).delete()
    db.query(models.Merchant).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()
    
    print("1. 註冊三端測試帳號 (消費者、商家、兩位外送員)...")
    # 消費者
    client.post("/api/auth/register", json={"email": "c@example.com", "password": "password123", "role": "consumer"})
    c_login = client.post("/api/auth/login", data={"username": "c@example.com", "password": "password123"})
    c_token = c_login.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}
    
    # 商家 1
    client.post("/api/auth/register", json={"email": "m1@example.com", "password": "password123", "role": "merchant"})
    m1_login = client.post("/api/auth/login", data={"username": "m1@example.com", "password": "password123"})
    m1_token = m1_login.json()["access_token"]
    m1_headers = {"Authorization": f"Bearer {m1_token}"}
    
    # 商家 2
    client.post("/api/auth/register", json={"email": "m2@example.com", "password": "password123", "role": "merchant"})
    m2_login = client.post("/api/auth/login", data={"username": "m2@example.com", "password": "password123"})
    m2_token = m2_login.json()["access_token"]
    m2_headers = {"Authorization": f"Bearer {m2_token}"}
    
    # 外送員 A (先註冊，空閒最久)
    client.post("/api/auth/register", json={"email": "da@example.com", "password": "password123", "role": "driver"})
    da_login = client.post("/api/auth/login", data={"username": "da@example.com", "password": "password123"})
    da_token = da_login.json()["access_token"]
    da_headers = {"Authorization": f"Bearer {da_token}"}
    
    # 手動調整外送員的 last_idle_at 以進行排序驗證
    db = SessionLocal()
    driver_a = db.query(models.User).filter(models.User.email == "da@example.com").first()
    driver_a.last_idle_at = datetime.utcnow() - timedelta(minutes=10) # 10 分鐘前空閒
    da_id = driver_a.id
    db.commit()
    
    # 外送員 B (後註冊，空閒較短)
    client.post("/api/auth/register", json={"email": "db@example.com", "password": "password123", "role": "driver"})
    db_login = client.post("/api/auth/login", data={"username": "db@example.com", "password": "password123"})
    db_token = db_login.json()["access_token"]
    db_headers = {"Authorization": f"Bearer {db_token}"}
    
    driver_b = db.query(models.User).filter(models.User.email == "db@example.com").first()
    driver_b.last_idle_at = datetime.utcnow() - timedelta(minutes=2) # 2 分鐘前空閒
    db_id = driver_b.id
    db.commit()
    
    # 商家 1 建立商品
    res = client.post("/api/merchants/products", json={"name": "牛肉麵", "price": 150}, headers=m1_headers)
    p_m1_1 = res.json()["id"]
    res = client.post("/api/merchants/products", json={"name": "滷肉飯", "price": 40}, headers=m1_headers)
    p_m1_2 = res.json()["id"]
    m1_id = res.json()["merchant_id"]
    
    # 商家 2 建立商品
    res = client.post("/api/merchants/products", json={"name": "雞肉飯", "price": 45}, headers=m2_headers)
    p_m2 = res.json()["id"]
    m2_id = res.json()["merchant_id"]
    
    print("✓ 帳號註冊與商品設定成功！")
    
    # 2. 測試下單限制（跨店點餐應失敗）
    print("2. 測試跨商家點餐限制驗證...")
    bad_order = {
        "merchant_id": m1_id,
        "items": [
            {"product_id": p_m1_1, "quantity": 1},
            {"product_id": p_m2, "quantity": 1} # 雞肉飯屬於商家 2
        ]
    }
    response = client.post("/api/orders/", json=bad_order, headers=c_headers)
    assert response.status_code == 400
    assert "不屬於指定商家" in response.json()["detail"]
    print("✓ 跨店點餐阻擋成功！")
    
    # 3. 測試下單（下架商品應失敗）
    print("3. 測試下架商品購買驗證...")
    client.delete(f"/api/merchants/products/{p_m1_2}", headers=m1_headers) # 下架滷肉飯
    bad_order2 = {
        "merchant_id": m1_id,
        "items": [
            {"product_id": p_m1_2, "quantity": 1}
        ]
    }
    response = client.post("/api/orders/", json=bad_order2, headers=c_headers)
    assert response.status_code == 400
    assert "已下架" in response.json()["detail"]
    print("✓ 下架商品阻擋成功！")
    
    # 4. 成功下單並驗證金額計算 (150 * 2 + 39 = 339)
    print("4. 測試正常下單與金額計算...")
    valid_order = {
        "merchant_id": m1_id,
        "items": [
            {"product_id": p_m1_1, "quantity": 2}
        ]
    }
    response = client.post("/api/orders/", json=valid_order, headers=c_headers)
    assert response.status_code == 201
    order_data = response.json()
    order_id = order_data["id"]
    assert order_data["status"] == "PENDING_STORE"
    assert float(order_data["delivery_fee"]) == 39.0
    assert float(order_data["total_amount"]) == 339.0
    print(f"✓ 訂單建立成功！單號: {order_id}, 總金額: {order_data['total_amount']} 元")
    
    # 5. 測試權限控管：消費者無法接單
    print("5. 測試越權接單阻擋...")
    response = client.post(f"/api/orders/{order_id}/accept", headers=c_headers)
    assert response.status_code == 403
    print("✓ 越權接單阻擋成功！")
    
    # 6. 商家接單
    print("6. 商家接單...")
    response = client.post(f"/api/orders/{order_id}/accept", headers=m1_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PREPARING"
    print("✓ 商家接單成功，狀態轉為準備中 (PREPARING)！")
    
    # 7. 商家標記準備完成，並驗證自動指派（應該指派給空閒最久的外送員 A）
    print("7. 商家準備完成並驗證空閒最長優先派單...")
    response = client.post(f"/api/orders/{order_id}/ready", headers=m1_headers)
    assert response.status_code == 200
    updated_order = response.json()
    
    # 因為有外送員 A，應該自動被指派並進入 DELIVERING
    assert updated_order["status"] == "DELIVERING"
    assert updated_order["driver_id"] == da_id
    
    # 驗證資料庫中外送員狀態
    db.close()
    db = SessionLocal()
    da_user = db.query(models.User).filter(models.User.id == da_id).first()
    db_user = db.query(models.User).filter(models.User.id == db_id).first()
    assert da_user.driver_status == "delivering"
    assert db_user.driver_status == "idle"
    print("✓ 自動派單成功！指派給外送員 A (da@example.com)，且外送員 A 狀態變為配送中。")
    
    # 8. 外送員 A 標記送達並收取現金
    print("8. 測試外送員送達完成訂單...")
    response = client.post(f"/api/orders/{order_id}/complete", headers=da_headers)
    assert response.status_code == 200
    completed_order = response.json()
    assert completed_order["status"] == "COMPLETED"
    
    db.refresh(da_user)
    assert da_user.driver_status == "idle"
    da_last_idle_at = da_user.last_idle_at
    print("✓ 訂單已送達，外送員 A 狀態回復為 idle！")
    
    # 9. 測試配單排序輪替：下一單應該指派給外送員 B（因為 A 剛剛才完成配送，B 現在是空閒最久的）
    print("9. 測試派單排序輪替 (外送員 B 優先)...")
    response = client.post("/api/orders/", json=valid_order, headers=c_headers)
    order_id_2 = response.json()["id"]
    client.post(f"/api/orders/{order_id_2}/accept", headers=m1_headers)
    
    # 準備完成
    response = client.post(f"/api/orders/{order_id_2}/ready", headers=m1_headers)
    assert response.json()["status"] == "DELIVERING"
    assert response.json()["driver_id"] == db_id
    
    db.refresh(db_user)
    assert db_user.driver_status == "delivering"
    print("✓ 第二單指派成功！如預期派給空閒最久的外送員 B (db@example.com)！")
    
    # 10. 測試無外送員可用時的排隊與自動配單
    print("10. 測試無空閒外送員時的排隊機制...")
    # 現在外送員 B 正在配送第二單
    # 我們讓外送員 A 也被指派第三單
    response = client.post("/api/orders/", json=valid_order, headers=c_headers)
    order_id_3 = response.json()["id"]
    client.post(f"/api/orders/{order_id_3}/accept", headers=m1_headers)
    response = client.post(f"/api/orders/{order_id_3}/ready", headers=m1_headers)
    assert response.json()["status"] == "DELIVERING"
    assert response.json()["driver_id"] == da_id
    
    # 現在外送員 A (配送第三單) 與 外送員 B (配送第二單) 皆在配送中，無空閒外送員。
    # 建立第四單並準備完成
    response = client.post("/api/orders/", json=valid_order, headers=c_headers)
    order_id_4 = response.json()["id"]
    client.post(f"/api/orders/{order_id_4}/accept", headers=m1_headers)
    response = client.post(f"/api/orders/{order_id_4}/ready", headers=m1_headers)
    
    # 驗證訂單維持 READY_FOR_PICKUP，且無 driver_id
    order_4_data = response.json()
    assert order_4_data["status"] == "READY_FOR_PICKUP"
    assert order_4_data["driver_id"] is None
    print("✓ 無空閒外送員時，第四單成功停留在待取餐 (READY_FOR_PICKUP) 狀態。")
    
    # 外送員 B 完成第二單配送，應會自動重配第四單給外送員 B
    print("11. 測試外送員完成配送後，排隊訂單自動重配...")
    response = client.post(f"/api/orders/{order_id_2}/complete", headers=db_headers)
    assert response.status_code == 200
    
    # 驗證第四單狀態與外送員指派
    order_4_res = client.get(f"/api/orders/{order_id_4}", headers=c_headers)
    assert order_4_res.json()["status"] == "DELIVERING"
    assert order_4_res.json()["driver_id"] == db_id
    
    db.refresh(db_user)
    assert db_user.driver_status == "delivering"
    print("✓ 重配成功！外送員 B 結束配送後，系統自動將排隊中的第四單指派給外送員 B。")
    
    db.close()
    print("\n=== 所有訂單與自動派單系統測試已順利通過！ ===")

if __name__ == "__main__":
    test_orders_flow()
