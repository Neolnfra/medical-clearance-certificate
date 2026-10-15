#!/usr/bin/env bash
# 明检 MedClear · 启动脚本
# 返回值：已启动=0；启动成功=0；启动失败=2
# 注意：端口固定为 4173，未显式传 PORT 时使用默认值。
cd "$(dirname "$0")"

PORT="${PORT:-4173}"
HOST="${HOST:-0.0.0.0}"
RUN_DIR=".run"
PID_FILE="${RUN_DIR}/server.pid"
LOG_FILE="${RUN_DIR}/server.log"
URL="http://127.0.0.1:${PORT}/"

mkdir -p "$RUN_DIR"

# 从 ss 提取占用该端口的 PID（不使用 fuser/lsof，不吞掉 ss 的报错）
port_pids() {
  ss -ltnp | awk -v p=":${PORT}" '$4 ~ (p"$") {print}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u
}

is_healthy() {
  curl -fs -o /dev/null "$URL"
}

# ---------- 1. 已启动则直接返回 0 ----------
if is_healthy; then
  echo "服务已在运行：${URL}（端口 ${PORT} 已就绪）"
  exit 0
fi

# 端口被占用但服务不健康，视为残留进程，先交由 stop.sh 清理
if [ -n "$(port_pids)" ]; then
  echo "检测到端口 ${PORT} 被占用但服务不可用，正在清理残留进程…"
  ./stop.sh
fi

# ---------- 2. 清理构建缓存 ----------
rm -rf dist
rm -rf node_modules/.vite

# ---------- 3. 依赖检查 ----------
if [ ! -d node_modules ]; then
  echo "未检测到 node_modules，开始安装依赖…"
  if ! npm install --no-audit --no-fund; then
    echo "依赖安装失败"
    exit 2
  fi
fi

# ---------- 4. 生产模式构建（限制内存，避免 OOM） ----------
echo "开始生产模式构建…"
if ! NODE_OPTIONS="--max-old-space-size=1024" npm run build; then
  echo "构建失败"
  exit 2
fi
if [ ! -f dist/index.html ]; then
  echo "构建失败：缺少产物 dist/index.html"
  exit 2
fi

# ---------- 5. 启动服务（先 export 再 nohup，避免环境变量被当成命令名） ----------
export MODE=online
export PORT
export HOST
nohup node --max-old-space-size=256 server.mjs >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
PID="$(cat "$PID_FILE")"

# ---------- 6. 轮询健康检查（不使用 timeout 命令） ----------
for _ in $(seq 1 30); do
  if is_healthy; then
    echo "启动成功：${URL}（pid ${PID}，日志 ${LOG_FILE}）"
    exit 0
  fi
  if ! kill -0 "$PID" > /dev/null 2>&1; then
    echo "启动失败：服务进程已退出，日志如下"
    tail -n 40 "$LOG_FILE"
    exit 2
  fi
  sleep 1
done

echo "启动失败：等待就绪超时，日志如下"
tail -n 40 "$LOG_FILE"
exit 2
