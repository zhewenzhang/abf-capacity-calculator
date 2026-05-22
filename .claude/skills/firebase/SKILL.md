---
name: firebase
description: Firebase 部署 Skill - 安全部署到 Hosting、Functions、Firestore
---

# Firebase Skill

## 安全原则
- ✅ 部署前必须验证项目 ID
- ✅ 部署前必须运行测试
- ✅ 敏感信息绝不提交到 Git
- ✅ 部署后自动进行健康检查

## 可用命令

### `/firebase-deploy <target>
部署到 Firebase

```
参数：
- target: hosting | functions | firestore | all（默认 all）

执行流程：
1. 🔍 预检查
   - 验证当前 Firebase 项目 ID
   - 确认不是生产环境误操作
   - 运行 npm test 确保测试通过

2. 🏗️ 构建
   - 运行 npm run build
   - 验证构建产物存在

3. 🚀 部署
   - 根据 target 部署对应服务

4. ✅ 验证
   - 检查部署状态
   - 请求健康检查端点
   - 确认关键页面可访问
```

### `/firebase-login
登录 Firebase CLI

### `/firebase-init
初始化 Firebase 配置

### `/firebase-emulators
启动本地 Firebase 模拟器进行开发

## 使用示例

```
/firebase-deploy hosting
/firebase-deploy all
```
