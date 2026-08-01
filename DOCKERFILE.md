# Dockerfile 版本说明

本项目提供两个 Dockerfile 版本，根据服务器网络环境选择使用：

## 📄 文件说明

### 1. `Dockerfile` - 国内镜像源版本（默认）

**适用场景**：
- ✅ 中国大陆服务器
- ✅ 网络访问 `deb.debian.org` 较慢或不稳定
- ✅ 需要加速 Docker 构建过程

**特性**：
- 使用阿里云 Debian 镜像源 (`mirrors.aliyun.com`)
- 使用 goproxy.cn 加速 Go 模块下载
- 更快的构建速度和更高的成功率

**关键修改**：
```dockerfile
# Debian 镜像源替换
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata libasan8 wget

# Go 代理配置
ENV GOPROXY=https://goproxy.cn,direct
```

**工作原理**：
- `sed -i 's/deb.debian.org/mirrors.aliyun.com/g'`：在 **Docker 构建阶段**替换 Debian 的软件源配置文件
- 这个替换只在镜像构建时生效，不影响运行时
- 确保 `apt-get update` 和 `apt-get install` 能够快速下载依赖包

---

### 2. `Dockerfile.original` - 官方源版本

**适用场景**：
- ✅ 海外服务器
- ✅ 网络访问 Debian 官方源流畅
- ✅ 企业内网有镜像缓存

**特性**：
- 使用 Debian 官方源 (`deb.debian.org`)
- 使用 Go 官方模块代理
- 与上游项目保持一致

---

## 🔄 如何切换版本

### 方法 1：使用不同的 Dockerfile

**使用国内镜像源版本（推荐）**：
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod build
```

**使用官方源版本**：
```bash
# 方式 1：临时切换
docker build -f Dockerfile.original -t new-api-peopledata:latest .

# 方式 2：修改 docker-compose.prod.yml
# 将 dockerfile: Dockerfile 改为 dockerfile: Dockerfile.original
```

### 方法 2：修改 docker-compose.prod.yml

编辑 `docker-compose.prod.yml`：

```yaml
services:
  new-api:
    build:
      context: .
      dockerfile: Dockerfile.original  # 改为使用官方源版本
```

---

## 🐛 故障排查

### 问题：构建失败 "Temporary failure resolving 'deb.debian.org'"

**原因**：服务器无法访问 Debian 官方源

**解决方案**：
1. 使用 `Dockerfile`（默认，已配置国内源）
2. 或配置 Docker DNS：
   ```bash
   sudo nano /etc/docker/daemon.json
   # 添加：
   {
     "dns": ["223.5.5.5", "8.8.8.8"]
   }
   sudo systemctl restart docker
   ```

### 问题：使用国内源后仍然失败

**解决方案**：
1. 检查服务器是否能访问 `mirrors.aliyun.com`：
   ```bash
   ping mirrors.aliyun.com
   ```

2. 尝试其他国内镜像源（编辑 Dockerfile）：
   ```dockerfile
   # 使用清华源
   RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources
   
   # 使用中科大源
   RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources
   ```

---

## 📊 性能对比

| 场景 | Dockerfile | Dockerfile.original |
|------|-----------|---------------------|
| 中国大陆服务器 | ✅ 快速 (~3-5 分钟) | ❌ 慢或失败 (>10 分钟) |
| 海外服务器 | ✅ 正常 | ✅ 快速 |
| 企业内网 | 取决于是否有镜像 | 取决于是否有镜像 |

---

## 💡 推荐做法

1. **生产环境（中国大陆）**：使用 `Dockerfile`（默认）
2. **开发环境（海外）**：使用 `Dockerfile.original`
3. **CI/CD 环境**：根据构建服务器位置选择

---

## 🔒 安全说明

两个版本的安全性相同：
- 都使用官方 Docker 基础镜像
- 都安装相同的依赖包
- 仅软件源地址不同，包内容通过校验和验证

镜像源只影响**下载速度**，不影响**软件安全性**。
