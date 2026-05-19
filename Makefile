.PHONY: help dev-up dev-down backend-install frontend-install db-migrate db-seed test

help:
	@echo "ABF 产能计算器 - 常用命令"
	@echo "  dev-up          启动开发环境 (Docker Compose)"
	@echo "  dev-down        停止开发环境"
	@echo "  backend-install 安装后端依赖"
	@echo "  frontend-install 安装前端依赖"
	@echo "  db-migrate      运行数据库迁移"
	@echo "  db-seed         导入种子数据"
	@echo "  test            运行测试"
	@echo "  lint            代码检查"

dev-up:
	docker-compose up -d

dev-down:
	docker-compose down

backend-install:
	cd backend && poetry install

frontend-install:
	cd frontend && npm install

db-migrate:
	cd backend && poetry run alembic upgrade head

db-seed:
	cd backend && poetry run python scripts/seed_data.py

test:
	cd backend && poetry run pytest tests/ -v

lint:
	cd backend && poetry run ruff check app/
