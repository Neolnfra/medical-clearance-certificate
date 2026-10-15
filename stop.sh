#!/usr/bin/env bash
# 明检 MedClear · 停止脚本
# 用 ss 提取监听端口的 PID 并终止；不使用 fuser/lsof。
cd "$(dirname "$0")"

PORT="${PORT:-4173}"
RUN_DIR=".run"
PID_FILE="${RUN_DIR}/server.pid"

# 从 ss 提取占用该端口的 PID（不吞掉 ss 的错误输出）
port_pids() {
  ss -ltnp | awk -v p=":${PORT}" '$4 ~ (p"$") {print}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u
}

PIDS="$(port_pids)"
if [ -f "$PID_FILE" ]; then
  FILE_PID="$(cat "$PID_FILE")"
  case "$FILE_PID" in
    ''|*[!0-9]*) ;;
    *) PIDS="$(printf '%s\n%s\n' "$PIDS" "$FILE_PID" | grep -E '^[0-9]+$' | sort -u)" ;;
  esac
fi

if [ -z "$PIDS" ]; then
  echo "端口 ${PORT} 无监听进程，服务未在运行"
  rm -f "$PID_FILE"
  exit 0
fi

echo "停止进程：$(echo "$PIDS" | tr '\n' ' ')"
for pid in $PIDS; do
  kill "$pid" || true
done

# 等待端口释放
for _ in $(seq 1 10); do
  if [ -z "$(port_pids)" ]; then break; fi
  sleep 1
done

# 普通终止未生效则强制结束
REMAIN="$(port_pids)"
if [ -n "$REMAIN" ]; then
  echo "普通终止未生效，强制结束：$(echo "$REMAIN" | tr '\n' ' ')"
  for pid in $REMAIN; do
    kill -9 "$pid" || true
  done
  sleep 1
fi

rm -f "$PID_FILE"
echo "服务已停止（端口 ${PORT}）"
exit 0
