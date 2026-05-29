# ABF Capacity Calculator — 安全 Demo Workspace 协议

**版本**: v1.0
**日期**: 2026-05-29
**用途**: Demo 环境安全管理规范

---

## 一、为什么需要隔离 Demo Workspace？

### 风险说明

| 风险类型 | 影响 | 严重度 |
|---------|------|--------|
| 生产数据污染 | 真实业务数据被 demo 数据覆盖 | Critical |
| 用户混淆 | 用户看到非真实数据做出错误决策 | High |
| 审计问题 | 无法区分真实数据和演示数据 | High |
| 数据丢失 | 清理 demo 时误删生产数据 | Critical |

### 隔离原则

1. **物理隔离** — Demo 数据必须在独立 workspace 中
2. **命名标识** — Demo workspace 必须包含 `[DEMO]` 前缀
3. **权限控制** — Demo workspace 使用独立测试账号
4. **生命周期管理** — Demo 用完即清理

---

## 二、如何创建 Demo Workspace

### 步骤 1: 创建 Firebase 测试项目（推荐）

```bash
# 使用 Firebase CLI 创建新项目
firebase projects:create abf-demo-workspace --display-name "ABF Demo"
```

### 步骤 2: 在现有 Firebase 项目中创建隔离 Workspace

如果无法创建新项目，在现有项目中创建隔离 workspace：

1. 使用 Demo Owner 账号登录
2. 创建新 workspace，命名为 `[DEMO] ABF Capacity Demo - YYYY-MM-DD`
3. 记录 workspace ID
4. 设置成员权限

### 步骤 3: 配置 Workspace

```
Workspace Name: [DEMO] ABF Capacity Demo - 2026-05-29
Owner: demo-owner@yourcompany.com
Members:
  - demo-editor@yourcompany.com (Editor)
  - demo-viewer@yourcompany.com (Viewer)
```

---

## 三、Demo 账号设计

### 推荐账号结构

| 角色 | 邮箱 | 用途 | 权限 |
|------|------|------|------|
| **Owner** | demo-owner@yourcompany.com | 演示主账号 | 完整权限 |
| **Editor** | demo-editor@yourcompany.com | 协作演示 | 编辑权限 |
| **Viewer** | demo-viewer@yourcompany.com | 只读演示 | 只读权限 |

### 账号创建建议

1. **使用独立邮箱** — 不要使用个人邮箱
2. **统一密码管理** — 使用密码管理器
3. **定期轮换** — 每次演示后更换密码
4. **限制访问** — 仅授权人员可访问

---

## 四、导入前检查清单

### 环境检查

- [ ] 确认当前 workspace 是 demo workspace（非生产）
- [ ] 确认 workspace 名称包含 `[DEMO]` 标识
- [ ] 确认使用的是 demo 测试账号
- [ ] 确认 Firebase 项目是 demo 项目（非生产）

### 数据检查

- [ ] 备份当前 workspace 数据（如有）
- [ ] 确认 demo JSON 文件完整（5 个文件）
- [ ] 验证 JSON 格式正确（可解析）
- [ ] 确认 C-ORPHAN SKU 不在 products 中

### 权限检查

- [ ] Owner 账号已登录
- [ ] Editor 账号已配置
- [ ] Viewer 账号已配置
- [ ] 权限测试通过

---

## 五、导入后验证清单

### 数据完整性验证

- [ ] Products: 34 个 SKU 已导入（不含 C-ORPHAN）
- [ ] Forecasts: 所有月度预测已导入
- [ ] Capacity: 3 个工厂配置已导入
- [ ] Parameters: 汇率、面板、良率已配置
- [ ] BP Targets: 2026、2027 年目标已配置

### DQ 问题验证

- [ ] A-NO-PRICE: 显示红色 "Missing Unit Price" Badge
- [ ] B-EUR-001: 显示红色 "Unsupported Currency" Badge
- [ ] C-ORPHAN: Forecasts 页面显示 "Orphan SKU" 警告
- [ ] F2 2026-09: Capacity 页面显示 "Missing capacity" 警告
- [ ] 2028 年: BP Targets 页面显示黄色警告

### 功能验证

- [ ] Dashboard: KPI 卡片正常显示
- [ ] Results: BP Analysis 正确显示缺口
- [ ] Operations: 异常诊断正常工作
- [ ] Scenario: 能够运行场景模拟
- [ ] AI Copilot: 能够回答问题

---

## 六、清理策略

### 演示后清理

```bash
# 选项 1: 删除整个 workspace
# 在 Firebase Console 中删除 workspace

# 选项 2: 清空数据但保留 workspace
# 删除所有 SKU、Forecast、Capacity 数据

# 选项 3: 标记为过期
# 重命名 workspace 为 [DEMO-EXPIRED] ...
```

### 清理时机

| 时机 | 操作 | 原因 |
|------|------|------|
| 演示完成后 | 标记为过期 | 保留供复查 |
| 1 周后 | 清空数据 | 释放空间 |
| 1 个月后 | 删除 workspace | 彻底清理 |

### 清理验证

- [ ] 确认 demo 数据已清除
- [ ] 确认生产数据未受影响
- [ ] 确认 workspace 状态正确

---

## 七、禁止事项

### 绝对禁止

| 禁止操作 | 原因 | 后果 |
|---------|------|------|
| 在生产 workspace 导入 demo 数据 | 污染真实业务数据 | 数据丢失 |
| 使用生产账号演示 | 暴露真实业务信息 | 安全风险 |
| 保留 demo 数据超过 1 个月 | 占用空间、造成混淆 | 管理混乱 |
| 未备份就导入 | 无法回滚 | 数据丢失 |

### 强烈不推荐

| 操作 | 原因 |
|------|------|
| 在同一 Firebase 项目混用 demo 和生产 | 难以隔离 |
| 使用个人账号创建 demo | 权限管理困难 |
| 不验证就导入 | 可能导入错误数据 |

---

## 八、未来 API 集成时的 Demo 数据隔离

### 架构建议

```
┌─────────────────────────────────────────┐
│           Firebase Project              │
├─────────────────────────────────────────┤
│  workspaces/                            │
│    ├── prod-workspace-001/  (生产)      │
│    │   ├── projects/                    │
│    │   └── members/                     │
│    ├── demo-workspace-001/  (Demo)      │
│    │   ├── projects/                    │
│    │   └── members/                     │
│    └── demo-workspace-002/  (Demo)      │
│        ├── projects/                    │
│        └── members/                     │
└─────────────────────────────────────────┘
```

### API 隔离策略

1. **Workspace ID 验证** — API 调用时验证 workspace 是否为 demo
2. **数据标记** — Demo 数据添加 `_demo: true` 标记
3. **读写限制** — Demo workspace 的写操作限制在测试环境
4. **API 限流** — Demo workspace 的 API 调用频率限制

### API 集成时的 Demo 数据管理

```typescript
// 未来 API 集成时的 demo 数据标记
interface DemoMarker {
  isDemo: boolean;
  demoCreatedAt: Date;
  demoExpiresAt: Date;
  demoPurpose: 'testing' | 'demo' | 'training';
}
```

---

## 九、安全最佳实践

### 访问控制

1. **最小权限原则** — 只给必要的权限
2. **定期审计** — 每月检查 demo workspace 访问日志
3. **及时清理** — 演示完成后立即清理
4. **文档记录** — 记录每次演示的 workspace ID

### 数据保护

1. **不使用真实数据** — Demo 数据必须是虚构的
2. **脱敏处理** — 如需使用真实数据比例，必须脱敏
3. **定期轮换** — 定期更换 demo 数据
4. **监控告警** — 监控异常访问

---

## 十、快速参考卡

### Demo Workspace 创建 Checklist

```
□ 创建 workspace，命名为 [DEMO] ABF Demo - YYYY-MM-DD
□ 配置 Owner/Editor/Viewer 账号
□ 验证账号权限
□ 备份现有数据（如有）
□ 导入 demo seed JSON
□ 验证 DQ 问题触发
□ 执行 demo story 测试
□ 记录 workspace ID
□ 设置清理提醒
```

### 紧急联系人

| 角色 | 职责 |
|------|------|
| Workspace Owner | 管理 workspace 成员和权限 |
| Firebase Admin | 管理 Firebase 项目配置 |
| Security Team | 处理安全事件 |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Demo Workspace Protocol Agent
