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

# 切换到定制分支
git checkout zhangsubo/feat-design-md-peopleopen
```

## 🔧 配置步骤

### 1. 修改 docker-compose.prod.yml

打开配置文件:
```bash
nano docker-compose.prod.yml
# 或使用 vim: vim docker-compose.prod.yml
```

**必须修改的配置项**:

```yaml
# PostgreSQL 密码
POSTGRES_PASSWORD: CHANGE_THIS_PASSWORD  # 改为强密码，例如: Pg@2024!SecurePass

# SQL 连接字符串中的密码
SQL_DSN=postgresql://newapi:YOUR_STRONG_PASSWORD@postgres:5432/newapi_db

# Redis 密码
command: redis-server --requirepass YOUR_REDIS_PASSWORD --appendonly yes
REDIS_CONN_STRING=redis://:YOUR_REDIS_PASSWORD@redis:6379

# 会话密钥（生成 32 位以上随机字符串）
SESSION_SECRET=your-random-32-char-secret-key-here

# 管理员初始密码
INITIAL_ROOT_PASSWORD=YOUR_ADMIN_PASSWORD
```

**生成随机密码的方法**:
```bash
# 方法 1: 使用 openssl
openssl rand -base64 32

# 方法 2: 使用 /dev/urandom
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
```

### 2. 可选配置

**修改端口** (如果 3000 端口已被占用):
```yaml
ports:
  - "8080:3000"  # 将 3000 改为其他端口
```

**启用外部数据库访问** (用于管理工具):
```yaml
postgres:
  ports:
    - "5432:5432"  # 取消注释此行
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
- ✅ 检查配置文件
- ✅ 拉取最新代码
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 显示访问信息

### 方法 2: 手动部署

```bash
# 1. 构建镜像
docker-compose -f docker-compose.prod.yml build

# 2. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 4. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔍 验证部署

### 1. 检查服务状态

```bash
docker-compose -f docker-compose.prod.yml ps
```

所有服务应该显示 `Up` 或 `healthy` 状态。

### 2. 访问服务

打开浏览器访问:
```
http://your-server-ip:3000
```

### 3. 首次登录

- 用户名: `root`
- 密码: 您在 `INITIAL_ROOT_PASSWORD` 中设置的密码

**⚠️ 重要**: 首次登录后立即修改管理员密码！

## 📝 常用运维命令

### 查看日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f new-api

# 查看最近 100 行日志
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart new-api
```

### 停止服务
```bash
docker-compose -f docker-compose.prod.yml down
```

### 更新部署
```bash
# 拉取最新代码
git pull origin zhangsubo/feat-design-md-peopleopen

# 重新构建并启动
docker-compose -f docker-compose.prod.yml up -d --build
```

### 备份数据
```bash
# 备份 PostgreSQL
docker exec postgres-peopledata pg_dump -U newapi newapi_db > backup-$(date +%Y%m%d).sql

# 备份数据目录
tar -czf data-backup-$(date +%Y%m%d).tar.gz ./data
```

### 恢复数据
```bash
# 恢复 PostgreSQL
cat backup-20241220.sql | docker exec -i postgres-peopledata psql -U newapi newapi_db
```

## 🔒 安全建议

1. **修改所有默认密码**
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
       }
   }
   ```
4. **定期备份数据**
5. **监控日志和资源使用**

## 🐛 故障排查

### 服务无法启动
```bash
# 查看详细错误
docker-compose -f docker-compose.prod.yml logs

# 检查端口占用
netstat -tulpn | grep 3000

# 重新构建镜像
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 数据库连接失败
```bash
# 检查数据库容器状态
docker ps | grep postgres

# 进入数据库容器
docker exec -it postgres-peopledata psql -U newapi newapi_db

# 测试连接
docker exec new-api-peopledata wget -qO- http://localhost:3000/api/status
```

### 性能问题
```bash
# 查看资源使用
docker stats

# 清理无用镜像和容器
docker system prune -a
```

## 📞 需要帮助？

如遇到问题，请检查:
1. 日志文件: `./logs/`
2. Docker 日志: `docker-compose -f docker-compose.prod.yml logs`
3. 系统资源: `docker stats`

---

**部署完成后，您将拥有:**
- ✅ 人民数据城市词元工厂定制界面
- ✅ 强制中文界面
- ✅ 强制深色主题
- ✅ 额度管理系统
- ✅ PostgreSQL 数据库
- ✅ Redis 缓存
- ✅ 完整的日志系统
