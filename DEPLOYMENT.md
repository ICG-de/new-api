# 人民数据城市词元工厂 - 服务器部署指南

## 📋 部署前准备

### 1. 服务器要求
- 操作系统: Linux (推荐 Ubuntu 20.04+ 或 CentOS 7+)
- 内存: 最低 2GB，推荐 4GB+
- 磁盘: 最低 20GB 可用空间
- 已安装: Docker 和 Docker Compose

### 2. 克隆代码到服务器

```bash
# SSH 登录到您的服务器
ssh user@your-server-ip

# 克隆仓库
git clone https://github.com/ICG-de/new-api.git
cd new-api

# 如果已经有特定分支，切换到该分支
# git checkout your-branch-name
```

## 🔧 配置步骤

### 1. 创建环境变量配置文件

```bash
# 复制环境变量示例文件
cp .env.prod.example .env.prod

# 编辑配置文件
nano .env.prod
# 或使用 vim: vim .env.prod
```

### 2. 修改 .env.prod 配置

**必须修改的配置项**:

```bash
# PostgreSQL 数据库密码
POSTGRES_PASSWORD=your_strong_password_here

# Redis 密码
REDIS_PASSWORD=your_redis_password_here

# 会话密钥（32位以上随机字符串）
SESSION_SECRET=your_random_session_secret_min_32_chars

# 管理员初始密码
INITIAL_ROOT_PASSWORD=your_admin_password_here
```

**生成强密码的方法**:
```bash
# 方法 1: 使用 openssl（推荐）
openssl rand -base64 32

# 方法 2: 使用 /dev/urandom
cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 32 | head -n 1

# 方法 3: 使用 pwgen (需先安装)
pwgen -s 32 1
```

### 3. 可选配置

**修改应用端口** (如果 3000 端口已被占用):
```bash
# 在 .env.prod 中修改
APP_PORT=8080
```

**启用外部数据库访问** (用于管理工具):
```bash
# 取消 docker-compose.prod.yml 中的端口映射注释
# postgres 服务下的 ports 部分
```

**启用 ClickHouse 日志存储**:
```bash
# 1. 在 .env.prod 中配置 ClickHouse 相关变量
CLICKHOUSE_PASSWORD=your_clickhouse_password

# 2. 在 docker-compose.prod.yml 中取消 clickhouse 服务的注释
# 3. 取消 new-api 服务中 LOG_SQL_DSN 环境变量的注释
```

## 🚀 部署执行

### 方法 1: 使用自动化部署脚本（推荐）

```bash
# 给脚本添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

脚本会自动:
- ✅ 检查系统环境
- ✅ 检查配置文件（包括 .env.prod）
- ✅ 拉取最新代码
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 显示访问信息

### 方法 2: 手动部署

```bash
# 1. 构建镜像
docker-compose -f docker-compose.prod.yml --env-file .env.prod build

# 2. 启动服务
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 3. 查看服务状态
docker-compose -f docker-compose.prod.yml --env-file .env.prod ps

# 4. 查看日志
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

## 🔍 验证部署

### 1. 检查服务状态

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod ps
```

所有服务应该显示 `Up` 或 `healthy` 状态。

### 2. 访问服务

打开浏览器访问:
```
http://your-server-ip:3000
```

### 3. 首次登录

- 用户名: `root`
- 密码: 您在 `.env.prod` 中 `INITIAL_ROOT_PASSWORD` 设置的密码

**⚠️ 重要**: 首次登录后立即修改管理员密码！

## 📝 常用运维命令

### 查看日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f new-api

# 查看最近 100 行日志
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100
```

### 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml --env-file .env.prod restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml --env-file .env.prod restart new-api
```

### 停止服务
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod down
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main  # 或您的分支名

# 重新构建并启动
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 备份数据
```bash
# 备份 PostgreSQL
docker exec postgres-peopledata pg_dump -U $(grep POSTGRES_USER .env.prod | cut -d '=' -f2) $(grep POSTGRES_DB .env.prod | cut -d '=' -f2) > backup-$(date +%Y%m%d).sql

# 备份数据目录
tar -czf data-backup-$(date +%Y%m%d).tar.gz ./data

# 备份环境变量配置
cp .env.prod .env.prod.backup-$(date +%Y%m%d)
```

### 恢复数据
```bash
# 恢复 PostgreSQL
cat backup-20241220.sql | docker exec -i postgres-peopledata psql -U $(grep POSTGRES_USER .env.prod | cut -d '=' -f2) $(grep POSTGRES_DB .env.prod | cut -d '=' -f2)
```

## 🔒 安全建议

1. **修改所有默认密码**
   - ✅ 使用 `.env.prod` 管理所有敏感配置
   - ✅ 不要将 `.env.prod` 提交到 Git

2. **启用防火墙**:
   ```bash
   # Ubuntu/Debian
   ufw allow 3000/tcp
   ufw enable
   ```

3. **使用反向代理** (Nginx + SSL):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **定期备份数据**
   - 建议设置定时任务自动备份

5. **监控日志和资源使用**
   ```bash
   # 查看资源使用
   docker stats
   
   # 设置日志轮转（防止日志文件过大）
   # 在 docker-compose.prod.yml 中添加 logging 配置
   ```

6. **保护 .env.prod 文件**
   ```bash
   # 设置文件权限
   chmod 600 .env.prod
   
   # 确保 .gitignore 包含此文件
   ```

## 🐛 故障排查

### 服务无法启动
```bash
# 查看详细错误
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs

# 检查端口占用
netstat -tulpn | grep 3000

# 重新构建镜像
docker-compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
```

### 数据库连接失败
```bash
# 检查数据库容器状态
docker ps | grep postgres

# 进入数据库容器
docker exec -it postgres-peopledata psql -U $(grep POSTGRES_USER .env.prod | cut -d '=' -f2) $(grep POSTGRES_DB .env.prod | cut -d '=' -f2)

# 测试应用连接
docker exec new-api-peopledata wget -qO- http://localhost:3000/api/status
```

### 环境变量未生效
```bash
# 检查 .env.prod 文件是否存在
ls -la .env.prod

# 检查环境变量是否正确加载
docker-compose -f docker-compose.prod.yml --env-file .env.prod config

# 重新启动服务
docker-compose -f docker-compose.prod.yml --env-file .env.prod down
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 性能问题
```bash
# 查看资源使用
docker stats

# 清理无用镜像和容器
docker system prune -a

# 查看日志文件大小
du -sh logs/
```

## 📞 需要帮助？

如遇到问题，请检查:
1. 环境变量配置: `.env.prod`
2. 日志文件: `./logs/`
3. Docker 日志: `docker-compose -f docker-compose.prod.yml --env-file .env.prod logs`
4. 系统资源: `docker stats`

---

**部署完成后，您将拥有:**
- ✅ 人民数据城市词元工厂定制界面
- ✅ 强制中文界面
- ✅ 强制深色主题
- ✅ 额度管理系统
- ✅ PostgreSQL 数据库
- ✅ Redis 缓存
- ✅ 完整的日志系统
- ✅ 安全的环境变量配置管理
