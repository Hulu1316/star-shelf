#!/usr/bin/env bash
# 星星书架 · 轻量服务器一键部署脚本（腾讯云 / 阿里云 轻量应用服务器，Ubuntu / Debian）
# 用法：在服务器上以 root 身份执行  bash deploy.sh
set -e

APP_DIR=/opt/star-shelf
PORT=3000
REPO=https://github.com/Hulu1316/star-shelf.git
NPM_MIRROR=https://registry.npmmirror.com

echo "== 星星书架 部署开始 =="

# 1) 安装 Node.js 18（优先用国内镜像下载二进制，避免访问 nodejs.org 超时）
if ! command -v node >/dev/null 2>&1 || [ "$(node -v 2>/dev/null | tr -d v | cut -d. -f1)" -lt 18 ]; then
  echo ">> 安装 Node.js 18 ..."
  NODE_TAR=/tmp/node18.tar.xz
  curl -fsSL https://mirrors.cloud.tencent.com/nodejs-release/v18.20.4/node-v18.20.4-linux-x64.tar.xz -o "$NODE_TAR" \
    || curl -fsSL https://cdn.npmmirror.com/binaries/node/v18.20.4/node-v18.20.4-linux-x64.tar.xz -o "$NODE_TAR"
  tar -xJf "$NODE_TAR" -C /usr/local --strip-components=1
  rm -f "$NODE_TAR"
fi
echo ">> Node: $(node -v)  npm: $(npm -v)"

# 2) 获取代码：若 server.js 已存在（本机打包上传场景）则跳过；否则尝试 git clone
if [ ! -f "$APP_DIR/server.js" ]; then
  echo ">> 拉取代码 ..."
  git clone "$REPO" "$APP_DIR" || {
    echo "!! git clone 失败（国内访问 GitHub 不稳定）。请在本机打包后上传："
    echo "   本机:  cd app && zip -r star-shelf.zip . -x data.json"
    echo "   上传:  scp star-shelf.zip root@<服务器IP>:/opt/star-shelf.zip"
    echo "   服务器: mkdir -p $APP_DIR && cd $APP_DIR && unzip -o /opt/star-shelf.zip"
    echo "   然后重新执行  bash deploy.sh"
    exit 1
  }
fi
cd "$APP_DIR"

# 3) 安装依赖（本项目零依赖，使用国内 npm 镜像加速）
echo ">> 安装依赖 ..."
npm install --registry=$NPM_MIRROR --omit=dev || true

# 4) 用 pm2 守护进程（崩溃自启 + 开机自启）
echo ">> 安装并启动 pm2 ..."
npm install -g pm2 --registry=$NPM_MIRROR
pm2 delete star-shelf 2>/dev/null || true
pm2 start server.js --name star-shelf
pm2 save
pm2 startup >/dev/null 2>&1 || true

echo "== 部署完成 =="
echo "访问地址: http://<服务器IP>:$PORT"
echo "若打不开，请到云控制台『防火墙 / 安全组』放行 TCP $PORT 端口（入站）。"
echo "演示账号: 家长 dad/123456 ；孩子 xiaoming、xiaohong / 123456"
