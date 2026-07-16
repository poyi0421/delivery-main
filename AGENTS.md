# 專案開發與 AI 協作規範 (AGENTS.md)

本文件定義本專案的開發技術規範與 AI 協作規則，所有 AI 代理（Agents）與人類開發者皆須嚴格遵守。

## 1. 技術棧與環境
- **後端 (Backend)**: FastAPI (Python 3.10+)
- **前端 (Frontend)**: React (JavaScript/TypeScript, 使用 Vite 建置)
- **開發資料庫**: SQLite (本地開發使用 `delivery.db` 檔案)
- **正式資料庫**: Render PostgreSQL (正式環境部署)
- **部署平台**: Render.com (前端部署為靜態網站，後端部署為 Web Service)

## 2. 安全與敏感資訊管理 (Secrets Management)
- **嚴禁硬編碼**: 絕對禁止在程式碼中硬編碼任何 API Key、密碼、Token、資料庫連線字串等機密資訊。
- **環境變數配置**: 
  - 所有敏感配置必須使用環境變數（Environment Variables）讀取。
  - 專案根目錄必須提供 `.env.example` 檔案，說明專案所需的環境變數名稱與格式，但不應填入真實金鑰。
  - 本地開發使用 `.env` 檔案儲存私密設定，且**必須將 `.env` 加入至 `.gitignore`**，防止其被提交至 Git。

## 3. 後端 FastAPI 開發規範
- **架構設計**: 採用模組化設計（`routers`, `models`, `schemas`, `crud` 職責分離）。
- **資料驗證**: 一律使用 Pydantic Model 進行 API 請求與回應的型別與欄位驗證。
- **異常處理**: 合理捕獲資料庫與業務邏輯錯誤，並回傳標準的 HTTP 狀態碼與 JSON 格式錯誤訊息（例如使用 `HTTPException`）。
- **CORS 設置**: 後端必須正確配置 CORS Middleware，允許來自前端 React 網址的跨域請求。

## 4. 前端 React 開發規範
- **狀態管理與 API 請求**: 使用 Axios 進行後端 API 呼叫，並落實 API 請求的 Loading（載入中）與 Error（錯誤處理）狀態呈現。
- **金鑰處理**: 任何第三方金鑰不可編碼於前端程式中。前端請求應一律通過 FastAPI 後端進行轉發。
- **回應式設計**: 介面需兼顧手機板與桌面板版面，確保外送員在手機上、消費者與店家在各式設備上皆能流暢操作。

## 5. 資料庫遷移與版本控管
- **遷移工具**: 本專案使用 Alembic 管理資料庫變更（Schema Migration）。
- **變更要求**: 每次資料表變更時必須產生對應的 Alembic 遷移檔，嚴禁直接在資料庫手動修改 Schema。
