#!/bin/bash
# ============================================================
# Apex-Finance iOS 描述文件导入脚本（移植自 wuba/taro-playground）
#
# 用途：在 GitHub Actions 的 macOS runner 上，把 base64 编码的
#       开发者描述文件 (.mobileprovision) 安装到系统 Provisioning Profiles。
#
# 所需环境变量：
#   PROVISIONING_PROFILE_DATA      - 描述文件的 base64 编码
#
# 由 .github/workflows/assemble_ios_release.yml 调用。
# ============================================================

set -euo pipefail

mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
echo "$PROVISIONING_PROFILE_DATA" | base64 --decode > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision