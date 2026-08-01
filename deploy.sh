#!/bin/bash

# 人民数据城市词元工厂 - 自动化部署脚本
#
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 功能:
#   - 拉取最新代码
#   - 构建 Docker 镜像
#   - 启动服务
#   - 查看日志

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的命令
check_requirements() {
    print_info "检查系统环境..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_success "系统环境检查通过"
}

# 检查配置文件
check_config() {
    print_info "检查配置文件..."

    if [ ! -f "docker-compose.prod.yml" ]; then
        print_error "docker-compose.prod.yml 文件不存在"
        exit 1
    fi

    if [ ! -f ".env.prod" ]; then
        print_error ".env.prod 文件不存在"
        print_info "请先创建环境变量配置文件:"
        print_info "  cp .env.prod.example .env.prod"
        print_info "  nano .env.prod  # 修改配置"
        exit 1
    fi

    # 检查具体哪些配置项未修改
    local has_default_config=false
    local unmodified_items=()

    # 检查各个配置项（只检查配置值，忽略注释行）
    if grep -v "^#" .env.prod | grep -q "POSTGRES_PASSWORD=CHANGE_THIS"; then
        unmodified_items+=("POSTGRES_PASSWORD")
        has_default_config=true
    fi

    if grep -v "^#" .env.prod | grep -q "REDIS_PASSWORD=CHANGE_THIS"; then
        unmodified_items+=("REDIS_PASSWORD")
        has_default_config=true
    fi

    if grep -v "^#" .env.prod | grep -q "SESSION_SECRET=CHANGE_THIS"; then
        unmodified_items+=("SESSION_SECRET")
        has_default_config=true
    fi

    if grep -v "^#" .env.prod | grep -q "INITIAL_ROOT_PASSWORD=CHANGE_THIS"; then
        unmodified_items+=("INITIAL_ROOT_PASSWORD")
        has_default_config=true
    fi

    if grep -v "^#" .env.prod | grep -q "CLICKHOUSE_PASSWORD=CHANGE_THIS"; then
        unmodified_items+=("CLICKHOUSE_PASSWORD (可选)")
        has_default_config=true
    fi

    # 如果有未修改的配置项，显示警告
    if [ "$has_default_config" = true ]; then
        print_warning "检测到以下配置项使用了默认值："
        for item in "${unmodified_items[@]}"; do
            print_warning "  ✗ $item"
        done
        echo ""
        print_warning "建议修改这些配置项以确保系统安全"
        echo ""
        read -p "是否继续部署？(y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "部署已取消"
            exit 0
        fi
    else
        print_success "所有必需配置项已修改"
    fi

    print_success "配置文件检查完成"
}

# 拉取最新代码
pull_code() {
    print_info "拉取最新代码..."

    if [ -d ".git" ]; then
        git fetch origin
        git checkout zhangsubo/feat-design-md-peopleopen
        git pull origin zhangsubo/feat-design-md-peopleopen
        print_success "代码更新完成"
    else
        print_warning "不是 Git 仓库，跳过代码拉取"
    fi
}

# 停止旧服务
stop_old_services() {
    print_info "停止旧服务..."

    if docker ps -a | grep -q "new-api-peopledata"; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down
        print_success "旧服务已停止"
    else
        print_info "没有运行中的服务"
    fi
}

# 构建镜像
build_image() {
    print_info "开始构建 Docker 镜像..."
    print_info "这可能需要几分钟时间，请耐心等待..."

    docker-compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

    print_success "Docker 镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动服务..."

    docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

    print_success "服务启动成功"
}

# 等待服务健康检查
wait_for_health() {
    print_info "等待服务启动..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker ps | grep -q "new-api-peopledata.*healthy\|Up"; then
            print_success "服务已就绪"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    print_warning "服务启动超时，请检查日志"
    return 1
}

# 显示服务状态
show_status() {
    print_info "服务状态:"
    docker-compose -f docker-compose.prod.yml --env-file .env.prod ps
}

# 显示访问信息
show_access_info() {
    echo ""
    echo "========================================="
    print_success "🎉 人民数据城市词元工厂部署完成！"
    echo "========================================="
    echo ""
    echo "访问地址:"
    echo "  HTTP:  http://localhost:3000"
    echo "  或:    http://$(hostname -I | awk '{print $1}'):3000"
    echo ""
    echo "默认管理员账号:"
    echo "  用户名: root"
    echo "  密码:   请查看 .env.prod 中的 INITIAL_ROOT_PASSWORD"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f"
    echo "  停止服务: docker-compose -f docker-compose.prod.yml --env-file .env.prod down"
    echo "  重启服务: docker-compose -f docker-compose.prod.yml --env-file .env.prod restart"
    echo "  查看状态: docker-compose -f docker-compose.prod.yml --env-file .env.prod ps"
    echo ""
    print_warning "⚠️  首次登录后请立即修改管理员密码！"
    echo "========================================="
}

# 显示日志
show_logs() {
    print_info "显示最近日志 (按 Ctrl+C 退出):"
    docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=50 -f
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  人民数据城市词元工厂 - 自动化部署"
    echo "========================================="
    echo ""

    # 执行部署步骤
    check_requirements
    check_config

    read -p "是否拉取最新代码？(Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        pull_code
    fi

    stop_old_services
    build_image
    start_services
    wait_for_health
    show_status
    show_access_info

    echo ""
    read -p "是否查看实时日志？(Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        show_logs
    fi
}

# 运行主函数
main
