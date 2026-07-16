from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, security
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.MerchantResponse])
def list_merchants(db: Session = Depends(get_db)):
    """消費者與公開用途：瀏覽所有商家"""
    return db.query(models.Merchant).all()


@router.get("/my/profile", response_model=schemas.MerchantResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：取得自家商店資訊"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
    return merchant


@router.put("/my/profile", response_model=schemas.MerchantResponse)
def update_my_profile(
    merchant_in: schemas.MerchantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：修改自家商店資訊"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
    
    update_data = merchant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(merchant, field, value)
        
    db.commit()
    db.refresh(merchant)
    return merchant


@router.get("/my/products", response_model=List[schemas.ProductResponse])
def get_my_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：取得自家完整商品清單（包含下架/未上架商品）"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
    return db.query(models.Product).filter(models.Product.merchant_id == merchant.id).all()


@router.get("/{id}/menu", response_model=List[schemas.ProductResponse])
def get_merchant_menu(id: int, db: Session = Depends(get_db)):
    """消費者與公開用途：瀏覽特定商家的所有餐點（僅包含上架中 is_available = True 的商品）"""
    # Verify merchant exists
    merchant = db.query(models.Merchant).filter(models.Merchant.id == id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該商家",
        )
    
    # Return available products
    return db.query(models.Product).filter(
        models.Product.merchant_id == id,
        models.Product.is_available == True
    ).all()


@router.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：新增餐點商品至自家菜單"""
    # Find merchant record for current user
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
    
    new_product = models.Product(
        merchant_id=merchant.id,
        name=product_in.name,
        description=product_in.description,
        price=product_in.price,
        is_available=True
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


@router.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(
    id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：編輯自家菜單商品資訊"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
        
    product = db.query(models.Product).filter(models.Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該商品",
        )
        
    # Check ownership
    if product.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權修改非自家商家的商品",
        )
        
    # Apply updates
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
        
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{id}", response_model=schemas.ProductResponse)
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.RoleChecker(["merchant"]))
):
    """店家專用：下架商品（軟刪除，將 is_available 設為 False）"""
    merchant = db.query(models.Merchant).filter(models.Merchant.user_id == current_user.id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到對應的商家資訊",
        )
        
    product = db.query(models.Product).filter(models.Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該商品",
        )
        
    # Check ownership
    if product.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您無權下架非自家商家的商品",
        )
        
    # Soft delete (set is_available to False)
    product.is_available = False
    db.commit()
    db.refresh(product)
    return product
