# 加入帳號與雲端同步功能（Firebase 整合藍圖）

目前「我的最愛」存在使用者瀏覽器的 localStorage，缺點是換裝置、換瀏覽器就沒了。這份文件說明如何升級成**使用者可登入、跨裝置同步**的版本。

## 技術選型

**推薦：Firebase**（Google 提供、免費額度充足、GitHub Pages 完美相容）

- **Firebase Authentication**：處理登入（Google OAuth 最簡單）
- **Firestore**：即時雲端資料庫儲存使用者最愛
- **免費額度**：每月 50K 次讀取、20K 次寫入、1GB 儲存空間 → 一個診所量完全夠用

替代方案：Supabase（Postgres 系，功能類似，也有免費版）

---

## 實作流程

### 1. 建立 Firebase 專案

1. 到 https://console.firebase.google.com/ 登入並建立新專案
2. 專案名稱：`icd10-search` 之類
3. 停用 Google Analytics（不需要）
4. 建立專案後，在 `Project Overview` 頁面選 **`</>` Web app**
5. 註冊應用程式名稱（例如 `icd10-web`）
6. 複製出現的 `firebaseConfig` 程式碼（下面會用到）

### 2. 啟用 Authentication

1. 左側選單 `Build` → `Authentication`
2. `Get started`
3. `Sign-in method` 分頁啟用：
   - **Google**（推薦，最方便）
   - 或 **Email/Password**（簡單但使用者需要記密碼）
4. 授權網域加入 `YOUR_USERNAME.github.io`

### 3. 建立 Firestore 資料庫

1. 左側選單 `Build` → `Firestore Database`
2. `Create database`
3. 選 `Start in production mode`（後面再設 rules）
4. 位置選 `asia-east1`（台灣附近）

### 4. 設定 Firestore 安全規則

Rules 頁面貼入：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 每位使用者只能讀寫自己的 favorites
    match /users/{userId}/favorites/{code} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. 修改網站程式碼

**新增 `firebase-config.js`**（根目錄）：

```js
// 填入你 Firebase 專案的 config
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

**修改 `index.html`**（在 `</body>` 前、`app.js` 之前加上）：

```html
<script type="module" src="firebase-config.js"></script>
<script type="module" src="auth.js"></script>
```

並在 header 加入登入按鈕：

```html
<button id="btn-login" class="btn">以 Google 登入</button>
<div id="user-info" hidden>
  <img id="user-avatar" />
  <span id="user-name"></span>
  <button id="btn-logout">登出</button>
</div>
```

**新增 `auth.js`**：

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 登入 / 登出
document.getElementById("btn-login").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

// 監聽登入狀態變化
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("btn-login").hidden = true;
    const info = document.getElementById("user-info");
    info.hidden = false;
    document.getElementById("user-avatar").src = user.photoURL;
    document.getElementById("user-name").textContent = user.displayName;

    // 訂閱使用者的最愛（即時同步）
    const favsRef = collection(db, "users", user.uid, "favorites");
    onSnapshot(favsRef, (snapshot) => {
      const codes = snapshot.docs.map((d) => d.id);
      // 呼叫主 app 的 API 更新最愛
      window.icd10App.setFavoritesFromCloud(codes);
    });
  } else {
    document.getElementById("btn-login").hidden = false;
    document.getElementById("user-info").hidden = true;
    // 登出時可選擇清空或保留本地最愛
  }
});

// 匯出 helper 讓主 app 呼叫
window.icd10Auth = {
  async addFavorite(code) {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "favorites", code), {
      addedAt: new Date().toISOString()
    });
  },
  async removeFavorite(code) {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "favorites", code));
  },
  getCurrentUser() {
    return auth.currentUser;
  }
};
```

**修改 `app.js`** 的 `toggleFavorite` 函式：

```js
function toggleFavorite(code) {
  const user = window.icd10Auth && window.icd10Auth.getCurrentUser();
  if (user) {
    // 已登入 → 更新雲端（onSnapshot 會自動同步回本地）
    if (state.favorites.has(code)) {
      window.icd10Auth.removeFavorite(code);
    } else {
      window.icd10Auth.addFavorite(code);
    }
  } else {
    // 未登入 → 用 localStorage
    if (state.favorites.has(code)) {
      state.favorites.delete(code);
    } else {
      state.favorites.add(code);
    }
    saveFavorites();
    updateFavCount();
    renderResults();
    if (state.view === "favorites") renderFavorites();
  }
  toast(state.favorites.has(code) ? "已加入最愛" : "已移除最愛");
}
```

並在 app 頂部 expose API 給 auth.js 用：

```js
window.icd10App = {
  setFavoritesFromCloud(codes) {
    state.favorites = new Set(codes);
    updateFavCount();
    renderResults();
    if (state.view === "favorites") renderFavorites();
  }
};
```

### 6. 測試

1. 推上 GitHub
2. 等 Pages 更新
3. 用無痕視窗開啟，點登入 → 應該跳出 Google 選擇帳戶視窗
4. 登入後點星星加入最愛 → 到 Firestore 後台 `users/{uid}/favorites/` 應該可以看到資料
5. 換另一台裝置登入同一帳號 → 最愛會即時同步

---

## 遷移舊有 localStorage 最愛

首次登入的使用者，可以把本地已有的最愛上傳到雲端：

```js
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  // 讀取 localStorage 的最愛
  const local = JSON.parse(localStorage.getItem("icd10cm_favorites_v1") || "[]");
  if (local.length === 0) return;
  // 批次寫入 Firestore
  for (const code of local) {
    await setDoc(doc(db, "users", user.uid, "favorites", code), {
      addedAt: new Date().toISOString(),
      migratedFromLocal: true
    });
  }
  // 清除本地，改用雲端
  localStorage.removeItem("icd10cm_favorites_v1");
  toast("已將 " + local.length + " 筆本地最愛同步到雲端");
});
```

---

## 成本評估

以一位家醫科醫師一天用 100 次、最愛約 50–100 筆為例：
- 讀取：一天約 100–200 次 → 一個月約 3,000–6,000 次（免費額度 50K）
- 寫入：新增最愛約一天 5 次 → 一個月約 150 次（免費額度 20K）
- 儲存：每位使用者約 10KB → 支援上萬使用者才會用到 1GB

**結論：永久免費** 直到使用者破萬。

---

## 其他可加分的功能

接完 Firebase 後，可以輕鬆擴充：

- **使用統計**：記錄每個代碼被誰用過幾次 → 產出個人化「最常用」排行
- **團隊共享**：同一診所的醫師可以共享一份最愛清單
- **標籤**：幫最愛加上 tag（例如「早上門診」、「慢性病追蹤」）
- **備註**：在每個代碼下寫個人筆記（用藥建議、注意事項）
- **分享連結**：把一組常用代碼包成連結分享

這些都可以延用同一套 Firestore 架構。

---

## 準備好接手了嗎？

當你想開始做這一階段時，直接跟 Claude 說：

> 我想把 ICD-10-CM 網站接上 Firebase 帳號系統，請參考 FIREBASE_ROADMAP.md 的計畫幫我實作。

我會根據這份文件逐步幫你做完整合。
