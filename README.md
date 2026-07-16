# 快勢捷外送平台 (Express Delivery Platform)

快勢捷是一個專為現代高效率外送流程設計的平台，採用**現代簡約風格**，並整合了三大核心使用者入口：
1. **消費者點餐端**：瀏覽合作商家、選購單店菜單、本地購物車管理（防跨店加點限制）、貨到付款 (COD) 下單、歷史訂單即時追蹤。
2. **商家管理端**：商店資訊修改、商品菜單 CRUD（新增/修改/上下架切換）、新訂單即時接收、接單製作與完成呼叫外送員看板（內建 10 秒自動輪詢）。
3. **外送員配送端**：空閒狀態常駐、配送任務 HUD 介面（顯示取餐點、送達點、應收現金金額）、一鍵確認送達回報、今日功績與配送車資收入統計。

---

## 🛠️ 技術棧 (Technology Stack)

* **後端 (Backend)**: FastAPI (Python 3.10+), SQLAlchemy, Uvicorn, Alembic, JWT 認證
* **前端 (Frontend)**: React (TypeScript, Vite), Vanilla CSS (現代簡約白色主題), Axios, Lucide React
* **資料庫 (Database)**: SQLite (本地開發 `delivery.db`), PostgreSQL (正式環境部署)
* **部署平台 (Deployment)**: Render.com (前端為靜態網站，後端為 Web 服務，資料庫為雲端 PostgreSQL)

---

## 💻 本地開發環境架設 (Local Setup)

### 1. 後端 (FastAPI) 架設

1. **進入後端目錄並建立虛擬環境**：
   ```bash
   cd backend
   python -m venv venv
   # Windows 啟用虛擬環境
   .\venv\Scripts\activate
   # macOS/Linux 啟用虛擬環境
   source venv/bin/activate
   ```

2. **安裝相依套件**：
   ```bash
   pip install -r requirements.txt
   ```

3. **環境變數設定**：
   在 `backend/` 目錄下複製 `.env.example` 並建立 `.env` 檔案：
   ```env
   DATABASE_URL=sqlite:///./delivery.db
   SECRET_KEY=your-super-secret-jwt-key
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

4. **資料庫遷移與初始化**：
   使用 Alembic 將資料庫結構同步至本地 `delivery.db`：
   ```bash
   alembic upgrade head
   ```

5. **啟動後端伺服器**：
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * 後端 API 文件網址：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. 前端 (React) 架設

1. **進入前端目錄並安裝套件**：
   ```bash
   cd frontend
   npm install
   ```

2. **啟動前端開發伺服器**：
   ```bash
   npm run dev
   ```
   * 前端網頁網址：[http://localhost:5173/](http://localhost:5173/)

---

## 🔄 資料庫遷移管理 (Database Migrations)

本專案使用 Alembic 管理資料庫 Schema 異動，請勿直接手動修改資料庫：

* **當您修改了 `backend/app/models.py` 的資料表結構後**：
  1. 產生新的遷移腳本：
     ```bash
     alembic revision --autogenerate -m "描述您的變更"
     ```
  2. 應用遷移到資料庫：
     ```bash
     alembic upgrade head
     ```
  3. 回滾上一次遷移：
     ```bash
     alembic downgrade -1
     ```

---

## ☁️ 雲端部署設定 (Render.com Deployment)

本專案可以直接部署至 **Render.com**，請先將專案推送至 GitHub。

### 1. 雲端資料庫部署 (Render PostgreSQL)

1. 在 Render 控制台點擊 **New** -> **PostgreSQL**。
2. 填寫名稱（例如 `delivery-db`）並選擇免費方案（Free）。
3. 建立完成後，複製 **External Connection String** (供本地連線測試) 或 **Internal Connection String** (供 Render 後端 Web 服務連線)。
   * 格式範例：`postgresql://user:password@hostname/dbname`

---

### 2. 後端 Web 服務部署 (Render Web Service)

1. 在 Render 控制台點擊 **New** -> **Web Service**。
2. 連結您 GitHub 的 `delivery` 專案儲存庫。
3. 進行以下配置：
   * **Name**: `delivery-backend`
   * **Language**: `Python`
   * **Root Directory**: `backend` (重要！設定為後端子目錄)
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. 點擊 **Advanced** 新增以下環境變數 (Environment Variables)：
   * `DATABASE_URL`: 貼上您剛剛建立的 Render PostgreSQL **Internal Connection String**。
   * `SECRET_KEY`: 設定一組高強度的隨機安全金鑰。
   * `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440` (Token 有效期天數)
5. 點擊 **Create Web Service** 進行部署。

---

### 3. 前端靜態網站部署 (Render Static Site)

1. 在 Render 控制台點擊 **New** -> **Static Site**。
2. 連結您 GitHub 的 `delivery` 專案儲存庫。
3. 進行以下配置：
   * **Name**: `delivery-frontend`
   * **Root Directory**: `frontend` (重要！設定為前端子目錄)
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist` (Vite 打包輸出的資料夾)
4. 點擊 **Create Static Site** 進行部署。
5. 部署完畢後，記下前端網站網址，並需至後端 Web Service 的環境變數中，新增 CORS 允許來源（如果後端有設定跨域安全白名單）。
