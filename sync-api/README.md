# Ben Health OS — 私人同步 API

此階段僅新增 API 程式，不會自動部署，也不會更動既有 Firestore 文件。

## 部署前準備

1. Firebase 專案 `ben-health-os` 需要 Blaze 方案及可部署 Cloud Functions 的權限。
2. 在電腦安裝 Node.js 22 與 Firebase CLI。
3. 於此儲存庫根目錄執行：

```bash
npm install -g firebase-tools
firebase login
firebase use ben-health-os
cd functions
npm install
npm run check
cd ..
firebase functions:secrets:set BEN_HEALTH_SYNC_KEY
firebase deploy --only functions:healthSync --project ben-health-os
```

Secret 請使用密碼管理器產生至少 32 bytes 的高強度隨機字串，不要傳送給 ChatGPT，也不要提交到 GitHub。首次部署後核對 CLI 回報的實際 HTTPS URL。

## 自訂 GPT Action

在 ChatGPT 的自訂 GPT 編輯器中，建立 Action，貼入 `sync-api/openapi.yaml`，Authentication 選 API Key、Bearer，將同一把 Secret 填在 GPT 編輯器的私密驗證欄位，不要放進 schema 或指令文字。

此版本使用專用 API Key，不是 OAuth。僅在私人 GPT 中使用；如密鑰外洩應立即輪替。

## 測試順序

1. 不帶 Authorization POST，預期 401。
2. 帶正確 Bearer 並寫入 `daily/2099-01-01`，預期 200。
3. Firebase Console 檢查 `users/<ownerUid>/daily/2099-01-01` 的內容。
4. 再送同日期新增欄位，確認合併而非清空其他欄位。
5. 在 Firebase Console 刪除這筆 **2099 測試紀錄**。
6. 完成後才切換 GitHub Pages 為唯讀介面。

## 注意

API 使用 Admin SDK，因此 Firestore Security Rules 不會約束此伺服器的寫入；授權與欄位檢查由 Cloud Function 執行。密鑰權限等同私人健康資料寫入權限，應妥善保護。

目前只支援 daily 和 weeks；體組成及檢驗報告待測試後擴充。資料寫入後，網站現有讀取機制會顯示更新，不需每次 commit GitHub。
