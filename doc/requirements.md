# Product Requirements Document (PRD) - 外送系統 (Delivery System)

## 1. Executive Summary & Core Value
- **Project Goal**: 建立一個外送媒合平台，串接消費者、合作店家與外送員。
- **Target Audience**: 
  - **一般消費者**：需要解決用餐問題的用戶。
  - **合作店家**：希望擴展陌生客群、增加餐點銷量的商家。
  - **外送員**：尋求彈性工作與外送收入機會的配送人員。
- **Core Value Proposition**: 
  - 協助消費者快速點餐，解決用餐問題。
  - 協助店家擴增客源與訂單量。
  - 提供外送員工作機會，達成三端的高效媒合。

## 2. Feature Scope
- **In-Scope Features**:
  - **消費者端**：
    - 瀏覽合作店家與菜單。
    - 購物車功能（加減餐點、清空）。
    - 提交訂單（僅支援貨到付款 COD，單次訂單僅限單一商家餐點，外送費固定為 39 元，無起送價限制）。
  - **店家端**：
    - 商品與菜單管理（商品上架、下架、編輯、刪除）。
    - 訂單管理（接收新訂單、標記開始製作、標記製作完成/待取餐）。
  - **外送員端**：
    - 接收系統指派訂單（不提供拒單功能，指派後直接生效）。
    - 標記取餐、開始配送、標記已送達並收取現金。
  - **系統/平台端**：
    - 自動指派系統（將待取餐訂單自動指派給空閒時間最長的外送員）。
- **Out-of-Scope (Future Scope)**:
  - **線上金流支付**：本版本僅支援貨到付款（收取現金），不支援信用卡或行動支付。
  - **即時通訊功能**：消費者、店家與外送員之間無即時聊天室。
  - **拒絕送單功能**：外送員無權拒絕系統指派之訂單。
  - **外送員即時定位追蹤**：本版本不包含地圖 GPS 定位與即時行蹤追蹤。
  - **訂單取消與退款**：本版本不支援任何訂單取消與退款機制，訂單一經提交必須執行完成。
  - **外送員上下線狀態**：外送員為常駐上線狀態，系統不提供上下線切換與休息功能。

## 3. User Scenarios & Key Workflows
- **User Roles**: 消費者 (Consumer)、店家 (Merchant)、外送員 (Driver)、系統 (System)
- **Typical Workflows**:
  - *外送流程閉環 (End-to-End Delivery Flow)*:
    1. **消費者**瀏覽店家選單，將餐點加入購物車，選擇「貨到付款」並送出訂單。訂單初始狀態為 `PENDING_STORE`（等待店家接單）。
    2. **店家**在後台查看到新訂單，點擊「接單」，訂單狀態變更為 `PREPARING`（準備中）。
    3. 店家製作完成後，點擊「標記為待取餐」，訂單狀態變更為 `READY_FOR_PICKUP`（待取餐）。
    4. **系統**將訂單指派給空閒的**外送員**，外送員狀態設為配送中，訂單狀態變更為 `DELIVERING`（配送中）。
    5. 外送員前往店家取餐，並送至消費者指定地點。
    6. 外送員送達後，向消費者收取現金，並點擊「標記已送達」，訂單狀態變更為 `COMPLETED`（已完成）。

## 4. Technical Stack & Integrations
- **Platform/Tech Stack**: 
  - **後端**：FastAPI (Python)
  - **前端**：React (Web)
  - **資料庫**：SQLite (本機開發) / Render PostgreSQL (正式環境)
  - **部署平台**：Render.com
- **Integrations**: 無其他外部第三方服務整合需求（無簡訊驗證碼、無 Google Map API 串接等）。
- **Constraints/Security/Data Storage**:
  - 資料庫設計需符合關聯式資料庫結構，以便後續無縫移轉至 PostgreSQL。
  - 機密資訊（資料庫連線、API Key）必須以環境變數管理，不可硬編碼。

## 5. Timeline, Milestones & Success Metrics
- **Development Timeline**: 預計今天內完成開發與測試。
- **Key Milestones**: 
  - 核心里程碑：各角色（消費者、店家、外送員）的功能皆能完整執行，並順利跑完一次上述的「外送流程閉環」。
- **Success Metrics**: 
  - 系統無重大程式崩潰錯誤，能成功執行一次完整的點餐、接單、指派、送達流程。
  - 系統成功部署至 Render.com 且資料庫能正常讀寫。
