# GitHub Pages 部署教學

把這個網站上線只需要 5 分鐘。以下是完整步驟。

## 前置準備

1. **GitHub 帳號**：若還沒有，到 https://github.com 註冊（免費）
2. **Git**（非必要，可用網頁版 GitHub 上傳）

## 方法 A：網頁版（最簡單，無需裝 Git）

### 步驟 1：建立 Repository

1. 登入 GitHub 後，點右上角 `+` → `New repository`
2. 填寫：
   - **Repository name**：建議用 `icd10-search` 或 `icd10-family-medicine`
   - **Description**：`家醫科 ICD-10-CM 代碼中文查詢工具`
   - **Public**（必須公開，Pages 才能啟用免費版）
   - 勾選 `Add a README file`（可之後覆蓋）
3. 點 `Create repository`

### 步驟 2：上傳檔案

1. 在新 repo 頁面點 `Add file` → `Upload files`
2. 把整個 `icd10-web` 資料夾裡的**檔案**（不是資料夾本身）拖進去：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `README.md`
   - `DEPLOY.md`（可選）
   - `FIREBASE_ROADMAP.md`（可選）
3. 最下方 commit message 填 `Initial commit`，點 `Commit changes`

### 步驟 3：啟用 GitHub Pages

1. 在 repo 頁面點 `Settings`（齒輪圖示）
2. 左側選單選 `Pages`
3. 在 `Source` 區塊：
   - `Branch`：選 `main`
   - 資料夾選 `/ (root)`
   - 點 `Save`
4. 稍等 1–3 分鐘，頁面頂端會顯示網址：

   ```
   Your site is live at https://YOUR_USERNAME.github.io/icd10-search/
   ```

5. 點進去測試！

---

## 方法 B：使用 Git 命令列

```bash
# 1. 建立 repo（可先在 GitHub 網頁建立空 repo）
cd /path/to/icd10-web
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/icd10-search.git
git push -u origin main

# 2. 到 GitHub 網頁上啟用 Pages（參見方法 A 步驟 3）
```

---

## 更新網站內容

每次要新增代碼或修正錯誤：

**網頁版**：
1. 進到 repo 中對應的檔案（通常是 `data.js`）
2. 點鉛筆圖示編輯
3. 修改後點 `Commit changes`
4. 幾分鐘後網站自動更新

**命令列版**：
```bash
# 編輯檔案後
git add .
git commit -m "新增更多神經內科代碼"
git push
```

---

## 自訂網域（進階，選用）

如果想用自己的網域（例如 `icd10.example.com`）：

1. 在網域 DNS 設定新增 CNAME 記錄指向 `YOUR_USERNAME.github.io`
2. 在 repo 的 Settings → Pages → Custom domain 填入網域
3. 勾選 `Enforce HTTPS`

---

## 常見問題

### Q：部署後網站顯示 404
- 確認 `index.html` 在 repo 的根目錄（不是在 `icd10-web/` 子資料夾裡）
- 確認 GitHub Pages 設定的資料夾是 `/ (root)`

### Q：中文字顯示錯誤或亂碼
- 確認所有檔案都是 UTF-8 編碼（預設就是）
- 確認 `index.html` 第 3 行有 `<meta charset="UTF-8">`

### Q：搜尋功能沒反應
- 打開瀏覽器開發工具 (F12) 查看 Console 是否有錯誤訊息
- 檢查 Fuse.js CDN 是否被防火牆擋住

### Q：最愛清單消失了
- 最愛存在瀏覽器的 localStorage，清除瀏覽器資料會被清掉
- 建議定期用「匯出 JSON」功能備份
- 未來接上 Firebase 後會改為雲端同步（參見 `FIREBASE_ROADMAP.md`）

### Q：想加入 Google Analytics
- 不建議。這是醫療工具，建議保持無追蹤、尊重使用者隱私
- 若堅持要加，在 `index.html` `<head>` 中嵌入 GA4 代碼即可

---

## 分享給同事

部署好之後，把網址分享給家醫科同事：

- 放在 LINE / Telegram 群組
- 在 Facebook 醫師社團發文
- 嵌入到各診所的內部網頁
- 列印 QR code 貼在門診電腦旁

如果反應好，之後可以做:
- 自訂網域讓網址更好記
- 加入 Firebase 帳號系統讓大家有自己的最愛清單
- 建立 GitHub Issues 讓使用者回報錯誤或建議新增代碼
