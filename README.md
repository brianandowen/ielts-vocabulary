# IELTS 單字練習室：六份教材整合版

## 開始使用與 Vercel 部署

無需 API 金鑰、Node.js 套件、後端或資料庫。將本資料夾直接放在 GitHub Repository 的根目錄，於 Vercel 匯入專案，Framework Preset 選 **Other**、Build Command 留空、Output Directory 留空，部署即可。也可以直接以瀏覽器打開 `index.html`。

**主頁**：`index.html`；**樣式**：`styles.css`；**互動**：`app.js`；**題庫載入**：`data/bank.js`。

若只更新單字資料：`data/vocabulary_master.json` 是主資料格式，`data/bank.js` 是供瀏覽器執行的同步快取。**只修改 JSON 並不會自動更新網站**，請同時重新產生 bank.js。範例可用以下 Python：

```python
import json
from pathlib import Path
root = Path('data')
m = json.loads((root / 'vocabulary_master.json').read_text(encoding='utf-8'))
obj = dict(words=m['words'], synonyms=m['synonyms'], affixes=m['affixes'], report=m['metadata'])
(root / 'bank.js').write_text('window.IELTS_BANK=' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';', encoding='utf-8')
```

### 複習和測驗

- **中翻英／認字**：翻卡、英文拼字（有首字母提示）、四選一英文認字。
- **同義詞**：由核心詞找相關替換詞、從替換詞反查核心詞，並展開教材原有語義群組。替換須看語境。
- **詞根詞綴**：看字首／字根／字尾猜意思、從例字辨認字族，也能翻卡複習例字中文。
- **熟悉度複習**：每張卡標記 1～4 級，按級別安排下次複習。選「今天需要複習」即可練待複習卡。
- **錯題**：自動記錯題，考完可重練錯題；支援 10/20/30/50/全部題。

熟悉度、錯題在目前瀏覽器的 `localStorage` 中；不跨裝置同步。可匯出／匯入進度 JSON 備份。

## 六份教材擷取範圍

- PDF：**6 份，1,079 頁**；逐頁抽文字／OCR 已處理 1,079 頁。
- 合併後單字索引：**3,923** 個（包含還不適合當考題的詞條）。
- 可直接出題的中英對照：**1,470** 個。
- 掃描版的中文候選、仍待檢查：**582** 個，可在網站選擇加入測驗。
- 尚缺可靠中文／保留索引：**1,871** 個，不會被當成中翻英的標準答案。
- 同義群組：**119**，詞根詞綴群組：**80**。
- OCR 拼字疑似錯字候選：**500** 筆，已合併或保留於檢查清單。拼字修正不是人工逐頁審查。

特別提醒：每頁執行 OCR **不代表** 每個單字的文字與詞義都百分之百準確。柯林斯雙欄、浮水印、音標、英英解釋加中文例句的頁面有些很難自動拆解，已留待複核。來源詞條僅保留方便個人複習所需的短詞義與頁碼，**不包含原版 PDF 全文或其長篇英中例句**。

## JSON 檔案與結構

| 檔案 | 用途 |
|---|---|
| `data/vocabulary_master.json` | 統一主檔：metadata、documents、words、synonyms、affixes |
| `data/words.json` | 去重整合詞條；`word`, `zh`, `senses`, `source_refs`, `categories`, `study_status` |
| `data/synonyms.json` | `base`, `related`, `zh`, `source`, `page` |
| `data/affixes.json` | `unit`, `meaning`, `kind`, `examples`, `source`, `page` |
| `data/review_queue.json` | OCR 疑似錯字、待查中文和純英文索引詞 |
| `data/page_audit.json` | PDF 逐頁 OCR/文字處理狀態 |
| `data/report.json` | 整體統計 |
| `coverage_report.csv` | 六份教材分別的詞數、測驗就緒／待檢數量 |

**詞義溯源**：`words[].senses[].origin` 記錄是來源文件文字、掃描候選或簡短補充翻譯；這是題庫內部 metadata，不在測驗畫面標示。`source_refs` 以 `document_id` 和 `page` 對應原始 PDF。對沒有中文、但存在教材英文詞條的資料保持 `study_status = index_only`，不會憑空建立考試答案。

## 使用限制

這些單字、語義分類來源於你提供的教材；請確認原出版物的授權要求。網站適合個人讀書與私下部署，**若 Vercel 網站公開可被任何人存取**，不宜以公開資源散布有版權的原教材內容。自訂網域、存取控制及部署權限請自行設定。
