# 換一台電腦繼續做這個遊戲

在家裡（或任何一台新電腦）把環境架起來，大概十分鐘。

---

## 一、先裝兩個東西

| 要裝什麼 | 去哪裡裝 | 注意 |
|---|---|---|
| **Git** | https://git-scm.com/download/win | 一路下一步就好，會順便裝 Git Bash |
| **Node.js 22 LTS** | https://nodejs.org | 一定要 **22 以上**。這個專案的 React Native 0.86 要 `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0`，選 LTS 那顆最穩 |

裝完開 Git Bash，確認一下：

```bash
git --version
node -v      # 要看到 v22.x 或更新
npm -v
```

---

## 二、把專案抓下來

**不要放在 OneDrive 裡面。** 公司那台是放在 `OneDrive\桌面\yiyi-game`，能動是能動，但
OneDrive 一邊同步 `.git` 一邊 git 在寫，遇過就知道有多痛；而且 `node_modules` 有 350 MB，
同步會卡到天荒地老。家裡這台直接放在乾淨的地方：

```bash
cd /c
mkdir -p dev && cd dev
git clone https://github.com/stevenwang21/yiyi-game.git
cd yiyi-game
```

第一次 push 的時候會跳出瀏覽器要你登入 GitHub，登一次之後就記住了（Git for Windows
自帶的 Credential Manager 會處理）。

---

## 三、裝套件

```bash
npm install
```

`node_modules` 沒有進 git（本來就不該進），所以**每台電腦都要自己跑一次**。
第一次大概三到五分鐘。

---

## 四、跑起來看看

```bash
npm run web
```

會開在 http://localhost:8081 。改 `src/` 底下任何檔案，瀏覽器會自己重新整理。

其他可以跑的：

```bash
node scripts/simulate.mjs    # 平衡度模擬，跑完大概四分鐘，會印出四個難度的破關率
npx expo export --platform web   # 手動打包，輸出到 dist/（平常不用，push 上去會自動打包）
```

---

## 五、每次開工和收工

**這是最重要的一段。** 兩台電腦輪流改同一個 repo，忘記 pull 就會打架。

開工第一件事：

```bash
git pull
```

收工最後一件事：

```bash
git add -A
git commit -m "今天改了什麼"
git pull --rebase
git push
```

push 完 GitHub Actions 會自動打包並更新 https://stevenwang21.github.io/yiyi-game/ ，
大概一到兩分鐘。手機上如果還是舊的，把那個分頁整個關掉重開（PWA 快取很頑固）。

### 萬一真的打架了

`git pull --rebase` 出現 conflict 的時候：

```bash
git status                   # 看是哪幾個檔案
# 用編輯器打開那些檔案，把 <<<<<<< ======= >>>>>>> 那幾段處理掉
git add <處理好的檔案>
git rebase --continue
```

想直接放棄這次 rebase 回到原狀：`git rebase --abort`

---

## 六、要繼續跟 Claude 一起做的話

在家裡那台開 Claude 桌面版，把 `yiyi-game` 資料夾連上去（Add folder），
然後在對話裡選「Link to this computer」。這樣 Claude 就能直接讀寫那台的檔案，
跟在公司那台一樣。

---

## 專案結構速查

```
src/game/      遊戲邏輯：事件、數值、同學、世界大事
  events*.js     各階段的事件（baby / school / club / love / rival / self ...）
  engine.js      主引擎，一年一年跑
  data.js        職業、家境、難度這些設定
  mates.js       同屆同學（同學會、排行榜共用同一份）
src/ui/        畫面
  Character.js   人物立繪組合、走路動畫、同學會舞台
  LineChart.js   所有折線圖（按住可以看每一年的數字）
  Clip.js        事件動畫（網頁播影片，App 播靜態圖）
  art/photos*.js 圖檔註冊表，三個檔案要一起改
public/art/    網頁版的圖
assets/art/    App 版的圖（同樣的圖，各留一份）
demo/          獨立的雛型，不會被打包進遊戲
```

**加新圖的時候**：`public/art/` 和 `assets/art/` 各放一份，
然後 `photos.js`、`photos.web.js`、`photos.native.js` **三個都要**加一行，少一個 App 版就會壞。
