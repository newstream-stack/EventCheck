# EventCheck 系統設置說明

## 1. Google Sheets 設定

### 建立 Service Account
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（或選擇既有專案）
3. 啟用 **Google Sheets API**
4. 前往「憑證」→「建立憑證」→「服務帳戶」
5. 建立後，點選該服務帳戶 → 「金鑰」→「新增金鑰」→「JSON」
6. 下載 JSON 檔案

### 建立 Google 試算表
1. 建立一個新的 Google Sheets 試算表
2. 將試算表 URL 中的 ID 複製（`/d/` 後面的部分）
3. 點選右上角「共用」，將服務帳戶的 Email 加入，賦予**編輯者**權限

### 填入 .env
```
GOOGLE_SHEETS_ID=試算表ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
> PRIVATE_KEY 來自下載的 JSON 檔案中的 `private_key` 欄位，注意保留 `\n`

## 2. Gmail 設定

1. 前往 Google 帳號 → 安全性 → 開啟「兩步驟驗證」
2. 搜尋「應用程式密碼」→ 新增一組（選「郵件」）
3. 將產生的 16 位密碼填入 `.env`

```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

## 3. 建立第一個管理者帳號

系統啟動後，需要手動在 Google Sheets 的 `users` 分頁新增第一筆管理者資料：

1. 開啟試算表，找到 `users` 分頁（系統首次啟動後自動建立）
2. 在終端機執行以下指令產生密碼 hash：

```bash
cd backend
node -e "import('bcryptjs').then(m => m.default.hash('你的密碼', 10).then(console.log))"
```

3. 在 `users` 分頁新增一列：
```
user_id: 任意UUID（可用 https://www.uuidgenerator.net/）
name: 管理者姓名
email: 登入用 email
password_hash: 上面產生的 hash
role: admin
created_at: 2024-01-01T00:00:00.000Z
```

## 4. 啟動系統

```bash
# 後端
cd backend
npm install
npm run dev

# 前端（另開終端機）
cd frontend
npm install
npm run dev
```

前端：http://localhost:5173
後端：http://localhost:3001

## Excel 匯入格式

| 姓名 | email | 電話 | 單位 |
|------|-------|------|------|
| 王小明 | wang@example.com | 0912345678 | 資訊部 |

欄位名稱支援中文（姓名、email、電話、單位）或英文（name、email、phone、unit）。
