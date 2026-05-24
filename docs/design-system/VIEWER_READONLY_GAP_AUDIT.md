# Viewer 只读漏洞白盒审计报告 (Viewer Read-Only Gap Audit)

为了死守多租户空间的安全性与交互防呆标准，本报告针对 ABF 产能计算器中所有高频录入表格（Spreadsheet / Grid / Input）在 **Viewer (只读观察员)** 角色下的只读拦截漏洞进行白盒代码定位与深度审计。

---

## 🚨 核心漏洞：只读隐藏了“保存”按钮，但网格本地仍可随意编辑

在当前的系统实现中，我们发现多处具有 Excel-like 批量录入功能的 Lab 页面，仅仅在 [保存] 和 [放弃] 按钮上做了权限判断（如 `disabled={!writable}`），**但却疏忽了在底层网格网格组件（react-datasheet-grid）中绑定只读属性**。

### ☠️ 产生的产品与交互灾难：
1. Viewer 角色用户双击网格任意单元格，仍然能够进入编辑状态，出现闪烁光标，且允许按 Backspace / Delete 擦除原数据。
2. Viewer 用户可以直接按下 `Ctrl + V` 粘贴大面积外部物理数据，覆盖本地内存中的表格展示。
3. 虽然最终无法点击置灰的 [保存] 按钮把数据写入 Firestore，但**在界面上已经造成了数据已更改的既定事实**。用户切换页面时甚至可能被脏状态拦截弹窗提示“有未保存修改”，导致 Viewer 产生“系统存在重大保存故障、自己越权编辑成功”的严重交互混淆。

---

## 🔍 白盒代码定位与风险审计

### 1. Products Spreadsheet Lab 页面
- **物理文件路径**：[ProductsSpreadsheetLab.tsx](file:///D:/abf-capacity-calculator-agy/frontend/src/pages/ProductsSpreadsheetLab.tsx)
- **漏防源码片段**（第 311-317 行）：
  ```typescript
  {/* Grid 漏防 */}
  <DataSheetGrid<SheetRow>
    value={rows}
    onChange={handleChange}
    columns={columns}
    rowHeight={32}
    height={Math.min(600, window.innerHeight - 280)}
  />
  ```
- **技术缺陷分析**：第 104 行成功定义了 `const writable = canEdit(scope.role);`，但在底层的 `<DataSheetGrid>` 组件中，**完全没有传递** `lockRows` 属性或为列配置绑定 `readOnly` 属性。
- **风险等级**：🔴 **高风险 (High)**。Viewer 可在此页随意涂改良率、售价和工艺参数，造成巨大的视觉污染与虚假编辑状态。

---

### 2. Capacity Lab (产能录入实验页)
- **物理文件路径**：[CapacitySpreadsheet.tsx](file:///D:/abf-capacity-calculator-agy/frontend/src/pages/CapacitySpreadsheet.tsx)
- **漏防源码片段**：
  ```typescript
  {/* Grid 漏防 */}
  <DataSheetGrid
    value={rows}
    onChange={setRows}
    columns={columns}
    // 缺失 readOnly 或 lockRows 属性！
  />
  ```
- **技术缺陷分析**：与 Products Spreadsheet 类似，隐藏了保存工具条，但未对 react-datasheet-grid 网格实施硬只读声明，设备额定产能可被只读观察员双击修改。
- **风险等级**：🔴 **高风险 (High)**。设备额定产能是产能计算的核心大梁，Viewer 可在本地篡改利用率计算基准。

---

### 3. Forecasts 销售预测纵向折叠输入页
- **物理文件路径**：[Forecasts.tsx](file:///D:/abf-capacity-calculator-agy/frontend/src/pages/Forecasts.tsx)
- **漏防源码分析**：
  - 页面内的月份输入框采用 Ant Design 的散装 `<InputNumber>`。
  - **白盒缺陷**：虽然在表单最底端的 `Button` 上通过 `disabled={!writable}` 禁用了保存，但 `<InputNumber>` 本身却没有绑定 `disabled={!writable}` 或 `readOnly={!writable}`，这使得 Viewer 用户仍可在折叠卡片中随意拨动增减数字。
- **风险等级**：🔴 **高风险 (High)**。预测数输入框多达几十个，Viewer 本地修改数字会让其误以为销售预测已被更改。

---

## 🛠️ CC 极简修补建议

开发团队 (CC) 在进行 **v1.25.0 - v1.26.0** 重构时，必须实施以下极简、安全的 **DOM 级只读硬阻断** 修补：

### 1. 对于 react-datasheet-grid 大表的完美硬拦截：
利用 `react-datasheet-grid` 提供的 `lockRows` 以及每列的 `disabled` 属性（或统一配置 `lockRows={!writable}`，同时通过 columns 对列属性进行劫持）：
```diff
  // columns 属性内绑定只读
  const columns = useMemo(() => {
    const tc = { ...textColumn };
    const fc = { ...floatColumn };
    const ic = { ...intColumn };
    return [
-     keyColumn<SheetRow, 'skuCode'>('skuCode', { ...tc, title: 'SKU Code', width: 100 }),
+     keyColumn<SheetRow, 'skuCode'>('skuCode', { ...tc, title: 'SKU Code', width: 100, disabled: !writable }),
-     keyColumn<SheetRow, 'customer'>('customer', { ...tc, title: 'Customer', width: 90 }),
+     keyColumn<SheetRow, 'customer'>('customer', { ...tc, title: 'Customer', width: 90, disabled: !writable }),
    ];
- }, []);
+ }, [writable]); // 注意必须将 writable 追加到依赖项中，确保权限切换时网格状态更新！

  // Grid 组件声明 lockRows
  <DataSheetGrid<SheetRow>
    value={rows}
    onChange={handleChange}
    columns={columns}
+   lockRows={!writable} // 强行锁死禁止添加、删除、或拖拽平刷！
  />
```

### 2. 对于散装 Input / InputNumber 场景的修补建议：
```diff
  <InputNumber
    value={monthValue}
    onChange={handleValChange}
+   disabled={!writable} // 彻底置灰，剥夺光标聚焦响应
  />
```
