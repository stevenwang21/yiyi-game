// 離線快取：註冊 service worker（放在獨立檔案，才能用嚴格的安全設定）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
