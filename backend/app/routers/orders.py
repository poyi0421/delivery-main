from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, security
from app.database import get_db

router = APIRouter()


def dispatch_pending_orders(db: Session):
    """
    自動指派系統：
    1. 尋找所有狀態為 READY_FOR_PICKUP (待取餐) 且未被指派外送員 (driver_id 為空) 的訂單，按建立時間 created_at 遞增排序（先進先出）。
    2. 尋找所有目前狀態為 idle (空閒) 且角色為 driver 的外送員，依照 last_idle_at 遞增排序（最久空閒者優先）。
    3. 依序進行指派，直到沒有待指派訂單或沒有空閒外送員為止。
    """
    # 搜尋待指派的 READY_FOR_PICKUP 訂單
    pending_orders = db.query(models.Order).filter(
        models.Order.status == "READY_FOR_PICKUP",
        models.Order.driver_id == None
    ).order_by(models.Order.created_at.asc()).all()
    
    if not pending_orders:
        return
        
    # 搜尋空閒外送員
    idle_drivers = db.query(models.User).filter(
        models.User.role == "driver",
        models.User.driver_status == "idle"
    ).order_by(models.User.last_idle_at.asc()).all()
    
    if not idle_drivers:
        return
        
    # 進行配對指派
    dispatched_count = min(len(pending_orders), len(idle_drivers))
    for i in range(dispatched_count):
        order = pending_orders[i]
        driver = idle_drivers[i]
        
        # 指派訂單與外送員
        order.driver_id = driver.id
        order.status = "DELIVERING"
        
        # 變更外送員狀態為配送中
        driver.driver_status = "delivering"
        
    db.commit()


@router.post("/", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["consumer"]))
):
    """消費者專用：下單建立新訂單"""
    # 驗證商家是否存在
    merchant = db.query(models.Merchant).filter(models.Merchant.id == order_in.merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到指定的商家",
        )
        
    # 獲取所有點餐商品 ID 並從資料庫載入
    product_ids = [item.product_id for item in order_in.items]
    products = db.query(models.Product).filter(models.Product.id.in_(product_ids)).all()
    
    # 建立商品快速查找對照表
    product_map = {p.id: p for p in products}
    
    # 驗證下單商品限制條件
    for item in order_in.items:
        product = product_map.get(item.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到商品 ID: {item.product_id}",
            )
        # 單店點餐限制驗證
        if product.merchant_id != order_in.merchant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品「{product.name}」不屬於指定商家",
            )
        # 商品上架狀態驗證
        if not product.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"商品「{product.name}」已下架，無法購買",
            )
            
    # 計算訂單餐點總金額
    items_total = 0.0
    for item in order_in.items:
        product = product_map[item.product_id]
        items_total += float(product.price) * item.quantity
        
    # 固定外送費 39 元
    delivery_fee = 39.00
    total_amount = items_total + delivery_fee
    
    # 建立 Order 記錄
    new_order = models.Order(
        consumer_id=current_user.id,
        merchant_id=order_in.merchant_id,
        status="PENDING_STORE",
        delivery_fee=delivery_fee,
        total_amount=total_amount
    )
    db.add(new_order)
    db.flush()  # 獲取訂單 id
    
    # 建立 OrderItem 快照記錄
    for item in order_in.items:
        product = product_map[item.product_id]
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.price
        )
        db.add(order_item)
        
    db.commit()
    db.refresh(new_order)
    return new_order


@router.get("/", response_model=List[schemas.OrderResponse])
def list_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """查詢訂單列表：依用戶角色過濾"""
    if current_user.role == "consumer":
        return db.query(models.Order).filter(models.Order.consumer_id == current_user.id).order_by(models.Order.created_at.desc()).all()
        
    elif current_user.role == "merchant":
        merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="找不到對應的商家資訊",
            )
        return db.query(models.Order).filter(models.Order.merchant_id == merchant.id).order_by(models.Order.created_at.desc()).all()
        
    elif current_user.role == "driver":
        return db.query(models.Order).filter(models.Order.driver_id == current_user.id).order_by(models.Order.created_at.desc()).all()
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無效的用戶角色",
        )


@router.get("/{id}", response_model=schemas.OrderResponse)
def get_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """取得單一訂單詳細資訊（包含權限驗證）"""
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到指定的訂單",
        )
        
    # 角色權限檢查
    if current_user.role == "consumer":
        if order.consumer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您無權檢視此訂單",
            )
    elif current_user.role == "merchant":
        merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
        if not merchant or order.merchant_id != merchant.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您無權檢視此訂單",
            )
    elif current_user.role == "driver":
        if order.driver_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您無權檢視此訂單",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權檢視此訂單",
        )
        
    return order


@router.post("/{id}/accept", response_model=schemas.OrderResponse)
def accept_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """商家專用：接單（狀態：PENDING_STORE -> PREPARING）"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
        
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到指定的訂單",
        )
        
    # 驗證接單者是否為該訂單商家
    if order.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權接受非自家商店的訂單",
        )
        
    if order.status != "PENDING_STORE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="該訂單狀態非待接單狀態，無法接單",
        )
        
    order.status = "PREPARING"
    db.commit()
    db.refresh(order)
    return order


@router.post("/{id}/ready", response_model=schemas.OrderResponse)
def ready_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """商家專用：餐點準備完成（狀態：PREPARING -> READY_FOR_PICKUP，並觸發自動派單）"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
        
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到指定的訂單",
        )
        
    # 驗證修改者是否為該訂單商家
    if order.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權對非自家商店的訂單進行此操作",
        )
        
    if order.status != "PREPARING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="該訂單狀態非準備中，無法標記準備完成",
        )
        
    order.status = "READY_FOR_PICKUP"
    db.commit()
    
    # 觸發系統自動指派外送員邏輯
    dispatch_pending_orders(db)
    
    db.refresh(order)
    return order


@router.post("/{id}/complete", response_model=schemas.OrderResponse)
def complete_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["driver"]))
):
    """外送員專用：配送完成並收取現金（狀態：DELIVERING -> COMPLETED，並更新外送員狀態與空閒時間，最後觸發排隊訂單重配）"""
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到指定的訂單",
        )
        
    # 驗證此訂單是否為該外送員配送
    if order.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權完成非您配送的訂單",
        )
        
    if order.status != "DELIVERING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="該訂單狀態非配送中，無法標記為完成",
        )
        
    # 更新訂單狀態為已完成
    order.status = "COMPLETED"
    
    # 將外送員重設為 idle，並更新 last_idle_at 為當前時間，排至配單隊列末尾
    current_user.driver_status = "idle"
    current_user.last_idle_at = datetime.utcnow()
    
    db.commit()
    
    # 外送員釋放後，檢查是否有其他先前無人接單而卡在 READY_FOR_PICKUP 的訂單需要指派
    dispatch_pending_orders(db)
    
    db.refresh(order)
    return order
