# ABF 产能计算器

ABF（Ajinomoto Build-up Film）产品销售营业额模型与产能应用计算器

## 技术栈

- **后端**: Python + FastAPI + SQLAlchemy + PostgreSQL
- **前端**: React 18 + TypeScript + Ant Design + Vite
- **数据库**: PostgreSQL + Redis (可选)

## 项目结构

```
abf-capacity-calculator/
├── backend/
│   ├── main.py              # FastAPI 主入口
│   ├── database.py          # 数据库连接
│   ├── init.sql             # 数据库初始化脚本
│   ├── requirements.txt     # Python 依赖
│   ├── models/              # SQLAlchemy 模型
│   │   └── database_models.py
│   ├── services/            # 业务逻辑
│   │   └── calculation_engine.py  # 核心计算引擎
│   ├── routes/              # API 路由
│   │   ├── products.py
│   │   ├── calculations.py
│   │   ├── capacity.py
│   │   └── parameters.py
│   └── schemas/             # Pydantic 模式
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/             # API 客户端
│   │   │   └── index.ts
│   │   ├── types/           # TypeScript 类型
│   │   │   └── index.ts
│   │   ├── components/      # 通用组件
│   │   │   └── Layout.tsx
│   │   ├── pages/           # 页面组件
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCreate.tsx
│   │   │   ├── Calculation.tsx
│   │   │   ├── CapacityPlan.tsx
│   │   │   └── Parameters.tsx
│   │   ├── store/           # 状态管理
│   │   └── utils/           # 工具函数
│   └── public/
```

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt

# 初始化数据库
psql -U postgres -f init.sql

# 启动服务
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 核心计算逻辑

### Core/BU 增层计算
- Core 本身 = 2 层，固定消耗 1 次
- BU 剻亪层次数 = (总层数 / 2) - 1
- 示例：4层板 = Core 1次 + BU 1次；8层板 = Core 1次 + BU 3次

### 良率矩阵
| 尺寸 | 4-8L | 10-14L | 16-20L | 20L+ |
|------|------|--------|--------|------|
| 小 | 98% | 96% | 94% | 92% |
| 中 | 88% | 86% | 84% | 82% |
| 大 | 82% | 80% | 78% | 76% |
| 超大 | 75% | 73% | 71% | 69% |

### 产能规划
| 时期 | Core | BU |
|------|------|-----|
| 2026 | 6,000 | 0 |
| 2027 Q1-Q3 | 每季 +650 | 每季 +3,000 |
| 2028+ | 每年 +1,800 | 每年 +10,000 |

## API 文档

启动后端后访问: http://localhost:8000/docs

## 开发进度

详见: `/Users/dave/ABF_产能计算器_工作进度.md`
