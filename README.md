# ICD-10-CM 速查 · 家庭醫學科

為台灣家庭醫學科醫師設計的 ICD-10-CM 代碼中文查詢工具。

## 特色

- **模糊搜尋**：支援中文、英文、代碼三種查詢方式，具容錯能力（打錯字也能找到）
- **即時結果**：輸入時立即顯示搜尋結果並高亮命中字元
- **類別篩選**：19 個家醫科常見分類，快速縮小範圍
- **我的最愛**：點擊 ★ 釘選常用代碼，資料存在瀏覽器本地
- **快速複製**：點擊一鍵複製代碼到剪貼簿
- **備份功能**：最愛清單可匯出/匯入 JSON 檔
- **行動友善**：手機、平板、電腦皆可使用
- **無需後端**：完全靜態網站，可部署在 GitHub Pages 免費空間

## 檔案結構

```
icd10-web/
├── index.html        # 主頁面
├── styles.css        # 樣式
├── app.js            # 主要邏輯（搜尋、最愛、視圖切換）
├── data.js           # ICD-10-CM 代碼資料（目前約 493 筆）
├── README.md         # 專案說明（本檔）
├── DEPLOY.md         # GitHub Pages 部署教學
└── FIREBASE_ROADMAP.md # 未來新增帳號同步功能的藍圖
```

## 快速上手

1. 把整個 `icd10-web` 資料夾的內容放進 GitHub 新 repository
2. 依 `DEPLOY.md` 步驟啟用 GitHub Pages
3. 幾分鐘後即可透過 `https://YOUR_USERNAME.github.io/REPO_NAME/` 訪問

本地測試：

```bash
cd icd10-web
python3 -m http.server 8000
# 或
npx serve
```

然後在瀏覽器開啟 `http://localhost:8000`

## 技術選型

- **前端**：原生 HTML / CSS / JavaScript，無建置步驟
- **搜尋**：[Fuse.js 7.0](https://www.fusejs.io/)（CDN 載入）
- **儲存**：localStorage（未來可升級為 Firebase）
- **字型**：系統字型（PingFang TC、Microsoft JhengHei）
- **無追蹤**：不使用 Google Analytics 或其他追蹤器

## 擴充代碼資料

最常見的修改就是新增代碼。編輯 `data.js`，在 `ICD_DATA` 陣列中加入：

```js
{ code: "E11.9", zh: "第2型糖尿病，無併發症", en: "Type 2 DM without complications", cat: "糖尿病", kw: "T2DM" },
```

欄位說明：
- `code`：ICD-10-CM 代碼（必填）
- `zh`：中文名稱（必填）
- `en`：英文名稱（必填）
- `cat`：分類（必填，會自動出現在類別按鈕）
- `kw`：（選填）額外搜尋關鍵字，例如縮寫、別名

新增分類時，請同時更新 `CATEGORY_ORDER` 陣列以確保顯示順序。

## 未來規劃

- [ ] 擴充代碼至 2000 筆，完整涵蓋家醫科場景
- [ ] 整合 Firebase Auth，支援 Google 登入
- [ ] 跨裝置同步我的最愛（Firestore）
- [ ] 代碼使用統計（記錄最常使用的代碼）
- [ ] 深色模式
- [ ] PWA 支援（離線可用、加入主畫面）
- [ ] 代碼關聯（顯示相關代碼建議）
- [ ] 可以接收社群回報的錯誤或新增建議

## 授權與免責聲明

本站代碼對照以衛生福利部中央健康保險署公告的 ICD-10-CM 中文譯本為基礎，本站僅供醫療人員參考使用，代碼對照可能因官方修訂而有差異，請以健保署最新公告為準。本站不取代臨床判斷或專業醫療建議。

程式碼部分建議採用 MIT 授權。

## 資料來源

- [衛生福利部中央健康保險署 ICD-10-CM 資料站](https://www.nhi.gov.tw/ch/np-3049-1.html)
- [中華民國醫師公會全聯會 ICD-10-CM 查詢系統](https://www.tma.tw/NhiLumpSum/index-category.asp)
