# Firestore 快照规则安全加固技术白皮书 (v1.22.2)

本文件详细记录了 **ABF Capacity Calculator** 在 v1.22.2 版本中针对 Firestore 安全规则中**快照路径重叠 (Overlap) 绕过漏洞**的深度审查、漏洞成因、纯 TypeScript 仿真回归测试设计以及最终的修复物理机理。

---

## 一、 漏洞物理成因剖析 (Root Cause Analysis)

在 v1.22.1 版本中，我们为个人快照与共享工作区快照定义了强有力的安全护栏（如 Immutable 禁止 update，以及 Editor 仅能删除自己创建的快照）。但是在 Firestore 规则引擎的求值环境中，这些专用保护规则却存在被「绕过」的漏洞。

### 1. Firestore 规则的 evaluation OR 语义
Firestore 安全规则（Security Rules）的设计与传统的 Web 拦截过滤器（如 Spring Security Filter Chain）或 Nginx ACL 的「自上而下、匹配即停（First Match Wins）」原则完全不同。
Firestore Rules 遵循的是 **「OR（或）求值」** 规则：
> **对于任一给定的文档路径，只要存在任意一条 match 规则将其 allow，则该请求就会被 Firestore 引擎批准放行。**

### 2. 漏洞发生路径
在旧版的 `firestore.rules` 中，存在以下通用递归匹配规则：

#### 个人模式通用递归：
```rules
match /users/{uid}/{document=**} {
  allow read, write: if isSelf(uid);
}
```

#### 工作区模式通用递归：
```rules
match /workspaces/{workspaceId}/projects/{projectId}/{document=**} {
  allow read: if isMember(workspaceId);
  allow write: if canWriteBusiness(workspaceId);
}
```

递归通配符 `{document=**}` 会无视路径深度，直接匹配该前缀下的**所有文档和子路径**。因此：
- **个人快照路径** `users/{uid}/projects/{projectId}/snapshots/{snapshotId}` 不仅会匹配快照专用 Match 规则，也同时匹配了通用递归 `users/{uid}/{document=**}`。
- **共享快照路径** `workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId}` 同样匹配了通用递归 `workspaces/{workspaceId}/projects/{projectId}/{document=**}`。

### 3. 安全危害复现场景

#### 场景 A：快照 Immutable 不可变拦截失效 (个人/工作区通用)
- 在专用规则中，我们声明了 `allow update: if false;`（表示任何人都绝不可修改已归档的快照，保障数据完整度）。
- 当本人（或工作区的 Editor）尝试 `update` 某条快照时，虽然专用规则返回了 `false`，但因为通用递归规则的 `allow write`（`write` 包括了 `create, update, delete`）条件 `isSelf(uid)` 或是 `canWriteBusiness(workspaceId)` 判定为 `true`。
- Firestore 引擎执行 OR 求值：`true || false => true`。**快照不可变规则被完美绕过，快照数据可被任意篡改！**

#### 场景 B：Editor 越权删除他人快照限制失效 (工作区专用)
- 在专用规则中，我们限制 Editor 仅能删除自己创建的快照：`allow delete: if role == 'editor' && resource.data.createdBy == request.auth.uid`。
- 但上层通用递归规则仅校验 `canWriteBusiness`（Editor 角色自然具备此写权限），并不核对 `resource.data.createdBy`。
- 当 Editor 删除他人建立的快照时，通用递归规则返回 `true`，专用规则返回 `false`。
- 最终引擎 OR 判定：`true || false => true`。**Editor 可以删除工作区内任意他人创建的快照，数据共享主权受损！**

---

## 二、 纯 TypeScript 仿真回归测试设计

为了在不引入重型 Java 虚拟机及外部 Firestore Emulator 的前提下，实现对路径重叠 OR 求值机制的自动化测试校验，我们在 `firestoreRules.test.ts` 中精心设计了一套**「组合规则仿真求值器」**。

### 1. 多匹配 OR 仿真评估
我们定义了 `evaluateWriteRequest` 函数，精确模拟真实 Firestore 对同一个写请求同时命中多个 Match 块时的逻辑抉择：
```typescript
function evaluateWriteRequest(evaluatedRules: boolean[]): boolean {
  return evaluatedRules.some(result => result === true);
}
```

### 2. 精确重现漏洞
通过这种模拟，我们在自动化单元测试中成功实现了对漏洞的重现：
```typescript
it('broad recursive project rules must not bypass snapshot-specific rules', () => {
  // 模拟 v1.22.1 环境：
  const userScopeV1_22_1 = isSelf({ uid: OWNER }, OWNER); // 通用 write 无白名单约束，直接返回 true
  const snapshotRule = personalSnapshotRule({ auth: { uid: OWNER }, uid: OWNER, op: 'update' }); // 专用 immutable 返回 false
  
  const allowedInV1 = evaluateWriteRequest([userScopeV1_22_1, snapshotRule]);
  expect(allowedInV1).toBe(true); // 🚨 漏洞证实：快照 update 成功被通用规则直接绕过！
});
```

### 3. 验证 v1.22.2 修复效果
通过将通用递归规则重构为精确 Collection 白名单，确保快照路径在通用规则下评估为 `false`，将其决策权 100% 交回给专用快照规则：
```typescript
it('broad recursive project rules must not bypass snapshot-specific rules [v1.22.2]', () => {
  // 模拟 v1.22.2：通用写规则带有 Collection 精确拦截白名单
  const userScopeV1_22_2 = userScope({ uid: OWNER }, OWNER, 'snapshots').write; // 匹配 snapshots 集合，通用 write 返回 false
  const snapshotRule = personalSnapshotRule({ auth: { uid: OWNER }, uid: OWNER, op: 'update' }); // 专用规则返回 false
  
  const allowedInV2 = evaluateWriteRequest([userScopeV1_22_2, snapshotRule]);
  expect(allowedInV2).toBe(false); // ✅ 修复证实：在 v1.22.2 下，快照 update 被完美且严密地 Deny 拦截！
```

---

## 三、 v1.22.2 修复物理机理 (Remediation Mechanics)

我们在 `/firestore.rules` 中实施的具体漏洞封堵机理如下：

### 1. 废除通用递归 `{document=**}`
我们彻底移除了针对个人项目和工作区项目路径下的通用 `{document=**}` 规则，杜绝其对底层所有子路径的模糊授权。

### 2. 精准 Collection 白名单拦截
我们定义了非快照的业务数据集合精确匹配白名单。由于 `snapshots` 这一 Collection 并不在白名单 `['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions']` 内，因此针对快照的写请求在通过上层 Match 块时会直接抛出 `false`（不予授权）。

#### 个人模式重构对比：
- **旧 (v1.22.1)**:
  `match /users/{uid}/{document=**} -> allow write: if isSelf(uid)`
- **新 (v1.22.2)**:
  ```rules
  match /users/{uid}/projects/{projectId} {
    allow read, write: if isSelf(uid);
  }
  match /users/{uid}/projects/{projectId}/{collectionName}/{docId} {
    allow read, write: if isSelf(uid) && collectionName in ['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions'];
  }
  ```

#### 工作区模式重构对比：
- **旧 (v1.22.1)**:
  `match /workspaces/{workspaceId}/projects/{projectId}/{document=**} -> allow write: if canWriteBusiness(workspaceId)`
- **新 (v1.22.2)**:
  ```rules
  match /workspaces/{workspaceId}/projects/{projectId} {
    allow read: if isMember(workspaceId);
    allow write: if canWriteBusiness(workspaceId);
  }
  match /workspaces/{workspaceId}/projects/{projectId}/{collectionName}/{docId} {
    allow read: if isMember(workspaceId);
    allow write: if canWriteBusiness(workspaceId) && collectionName in ['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions'];
  }
  ```

---

## 四、 下一阶段安全测试闭环计划 (Future Hardening Plans)

虽然我们在 plain TypeScript 测试中以极高的逻辑复杂度仿真复现并修复了此漏洞，但从长期成熟产品的角度出发，为了应对更复杂的规则漂移，我们建议在 **Phase 7** 中引入真正的 **Firestore Emulator 单元测试闭环**：

1. **引入依赖**：在开发环境中引入 Java JDK 并配置 Firestore Emulator。
2. **测试包集成**：引入官方 `@firebase/rules-unit-testing` 工具库。
3. **真实环境回归**：在 `frontend/src/services/` 下新增 `firestoreRules.emulator.test.ts`，使用内存数据库和真实规则引擎实例，对所有的 overlap 与边界特权进行百分之百真实的网络与权限事务阻断测试，形成彻底的安全交付锁链。
