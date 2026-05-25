# Smoke Test 總檢查清單

本文檔為 ABF Capacity Calculator v1.29.0 的完整煙霧測試檢查清單，涵蓋所有主要功能流程。

## 測試前置條件

- [ ] 已準備兩個 Google 帳號（用於測試 Workspace 協作）
- [ ] 瀏覽器：Chrome / Firefox / Edge 最新版
- [ ] 語言：英文 / 繁中皆需測試

---

## 1. Login 登入

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 點擊 Google 登入按鈕 | 跳轉 Google OAuth | |
| 授權後返回應用 | 進入 Dashboard | |
| 登出後回到登入頁 | 顯示登入按鈕 | |
| 無 Firebase 配置 | 顯示 Setup 頁面 | |

---

## 2. Products 產品管理

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 新增 SKU（完整資料） | 成功建立，列表顯示 | |
| 新增 SKU（缺必填欄位） | 顯示驗證錯誤 | |
| 編輯現有 SKU | 資料更新成功 | |
| 刪除 SKU | 成功刪除，列表移除 | |
| 下載匯入範本 | 下載 Excel 檔案 | |
| 匯入 Excel | 資料正確匯入 | |
| 匯出 Excel | 下載完整資料 | |
| Viewer 嘗試編輯 | 按鈕 disabled，無法修改 | |

---

## 3. Products Spreadsheet Lab

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 頁面載入 | 顯示 spreadsheet grid | |
| 輸入資料 | 儲存格可編輯 | |
| 貼上多列資料 | 正確貼上 | |
| 驗證按鈕 | 顯示驗證結果 | |
| 儲存有效列 | 成功儲存 | |
| 匯出 CSV | 下載檔案 | |
| Viewer 嘗試編輯 | 儲存格 disabled，無法修改 | |
| Viewer 唯讀警告 | 顯示 Alert 提示 | |

---

## 4. Forecasts 預測管理

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 新增單筆預測 | 成功建立 | |
| 編輯預測數量 | 更新成功 | |
| 刪除預測 | 成功刪除 | |
| 批量產生（依年份） | 正確產生 | |
| 批量產生（依成長率） | 正確計算 | |
| 匯出預測 | 下載 Excel | |
| Viewer 嘗試編輯 | 按鈕 disabled | |

---

## 5. Forecasts Spreadsheet Lab

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 年份選擇器 | 切換年份，資料重新載入 | |
| 輸入預測數量 | 儲存格可編輯 | |
| Dirty 狀態追蹤 | 修改顯示橘色高亮 | |
| 儲存變更 | 成功儲存 | |
| 放棄變更 | 還原為原始值 | |
| 輸入 0 | 刪除該筆預測 | |
| Viewer 嘗試編輯 | 儲存格 disabled | |
| Viewer 唯讀警告 | 顯示 Alert | |

---

## 6. Capacity 產能規劃

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 新增工廠 | 成功建立 | |
| 編輯產能數值 | 更新成功 | |
| 刪除工廠 | 成功刪除 | |
| Fill Forward (→→) | 後續月份套用相同值 | |
| 批次設定 | 多月份同時設定 | |
| 切換檢視模式 | Month/Quarter/Year 正確顯示 | |
| 產能趨勢圖 | 圖表正確渲染 | |
| Viewer 嘗試編輯 | 按鈕 disabled | |

---

## 7. Capacity Spreadsheet Lab

| 項目 | 預期結果 | Pass |
|------|----------|------|
| Core/BU 分頁 | 正確切換 | |
| 輸入產能數值 | 儲存格可編輯 | |
| Dirty 狀態追蹤 | 修改顯示橘色高亮 | |
| 儲存變更 | 成功儲存 | |
| 放棄變更 | 還原為原始值 | |
| Viewer 嘗試編輯 | 儲存格 disabled | |
| Viewer 唯讀警告 | 顯示 Alert | |

---

## 8. BP Targets 營業目標

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 頁面載入 | 顯示 2026-2040 欄位 | |
| 輸入目標數值 | 成功輸入 | |
| 儲存變更 | 成功儲存 | |
| 放棄變更 | 還原為原始值 | |
| 輸入負數 | 顯示錯誤訊息 | |
| 清空欄位 | 儲存後該年份移除 | |
| Viewer 嘗試編輯 | 儲存格 disabled | |
| Viewer 唯讀警告 | 顯示 Alert | |
| Parameters 頁跳轉卡片 | 點擊跳轉至 BP Targets | |

---

## 9. Parameters 參數設定

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 編輯工作天數 | 更新成功 | |
| 編輯 Panel 參數 | 更新成功 | |
| 編輯 Yield Matrix | 更新成功 | |
| 儲存參數 | 成功儲存（BP 不被覆蓋） | |
| Restore Defaults | 預設值還原（BP 不被清除） | |
| BP 跳轉卡片存在 | 顯示跳轉按鈕 | |
| 無 BP 編輯表格 | 確認已移除 | |

---

## 10. Dashboard 儀表板

| 項目 | 預期結果 | Pass |
|------|----------|------|
| KPI 卡片顯示 | SKU 數、預測量、營收、利用率 | |
| 營收趨勢圖 | 圖表正確渲染 | |
| BP 達成率區塊 | 顯示 Target/Revenue/Gap | |
| 幣別切換 | USD/TWD/CNY 正確換算 | |
| 語言切換 | EN/繁中 正確顯示 | |
| 無資料狀態 | 顯示 Empty State | |

---

## 11. Results 分析結果

| 項目 | 預期結果 | Pass |
|------|----------|------|
| Sales 分頁 | 營收分析正確 | |
| Product Planning 分頁 | 產品分析正確 | |
| Capacity 分頁 | 產能分析正確 | |
| Raw 分頁 | 原始明細顯示 | |
| BP Analysis 分頁 | BP 達成率分析 | |
| Risk Brief 分頁 | 風險摘要顯示 | |
| 各分頁無報錯 | 正常載入 | |

---

## 12. Snapshot Change Review

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 建立 Snapshot | 成功建立 | |
| Snapshot 列表 | 顯示所有版本 | |
| 選擇比較版本 | Base/Target 選擇 | |
| 比較結果 | 顯示差異分析 | |
| 刪除 Snapshot | 成功刪除 | |
| Viewer 查看 Snapshot | 可查看 | |
| Viewer 建立 Snapshot | 無法建立 | |

---

## 13. AI Brief Export

| 項目 | 預期結果 | Pass |
|------|----------|------|
| Copy AI Brief Pack | 複製中文提示詞 + JSON | |
| Copy Prompt | 複製提示詞 | |
| Copy JSON | 複製 JSON | |
| Download JSON | 下載 UTF-8 BOM 檔案 | |
| 無敏感資訊 | 不含 UID/Email/路徑 | |

---

## 14. Workspace Owner/Editor/Viewer

### Owner 測試

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 建立工作區 | 成功建立 | |
| 邀請成員 | 成功加入 | |
| 變更成員角色 | 成功變更 | |
| 移除成員 | 成功移除 | |
| 編輯資料 | 可編輯 | |

### Editor 測試

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 查看資料 | 可查看 | |
| 編輯資料 | 可編輯 | |
| 管理成員 | 無權限 | |
| 刪除工作區 | 無權限 | |

### Viewer 測試

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 查看資料 | 可查看 | |
| Products 編輯 | 按鈕 disabled | |
| Forecasts 編輯 | 按鈕 disabled | |
| Capacity 編輯 | 按鈕 disabled | |
| BP Targets 編輯 | 儲存格 disabled | |
| Spreadsheet Lab 編輯 | 儲存格 disabled + Alert | |
| 儲存操作 | 所有 Save 按鈕 disabled | |

---

## 15. i18n 國際化

| 項目 | 預期結果 | Pass |
|------|----------|------|
| 英文介面完整 | 無中文混雜 | |
| 繁中介面完整 | 無英文混雜（專有名詞除外） | |
| 語言切換即時生效 | 無需重新整理 | |
| 無 mojibake 亂碼 | 所有文字正常顯示 | |

---

## 測試簽核

| 項目 | 簽核人 | 日期 |
|------|--------|------|
| Login | | |
| Products | | |
| Products Lab | | |
| Forecasts | | |
| Forecasts Lab | | |
| Capacity | | |
| Capacity Lab | | |
| BP Targets | | |
| Parameters | | |
| Dashboard | | |
| Results | | |
| Snapshot | | |
| AI Export | | |
| Workspace | | |
| i18n | | |

**測試版本**：v1.29.0
**測試日期**：________________
**測試人員**：________________
