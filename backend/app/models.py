from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean, Index
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'consumer', 'merchant', 'driver'
    driver_status = Column(String, nullable=True)  # 'idle', 'delivering' for drivers, NULL otherwise
    last_idle_at = Column(DateTime, nullable=True)  # timestamp for longest idle dispatch logic
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_driver_dispatch", "role", "driver_status", "last_idle_at"),
    )

    # Relationships
    merchant = relationship("Merchant", back_populates="user", uselist=False)
    orders_as_consumer = relationship("Order", foreign_keys="[Order.consumer_id]", back_populates="consumer")
    orders_as_driver = relationship("Order", foreign_keys="[Order.driver_id]", back_populates="driver")


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="merchant")
    products = relationship("Product", back_populates="merchant")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="products")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="PENDING_STORE", nullable=False)
    # PENDING_STORE, PREPARING, READY_FOR_PICKUP, DELIVERING, COMPLETED
    delivery_fee = Column(Numeric(10, 2), default=39.00, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_orders_status", "status"),
        Index("idx_orders_consumer", "consumer_id"),
        Index("idx_orders_merchant", "merchant_id"),
    )

    # Relationships
    consumer = relationship("User", foreign_keys=[consumer_id], back_populates="orders_as_consumer")
    driver = relationship("User", foreign_keys=[driver_id], back_populates="orders_as_driver")
    merchant = relationship("Merchant")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)  # price snapshot at ordering time

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
