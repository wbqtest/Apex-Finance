#!/bin/bash
# ============================================================
# Apex-Finance iOS 签名证书导入脚本（移植自 wuba/taro-playground）
#
# 用途：在 GitHub Actions 的 macOS runner 上，把 base64 编码的
#       签名证书 (.p12) 导入临时 keychain，供 codesign 使用。
#
# 所需环境变量：
#   SIGNING_CERTIFICATE_P12_DATA   - 证书 .p12 文件的 base64 编码
#   SIGNING_CERTIFICATE_PASSWORD   - 证书口令
#
# 由 .github/workflows/assemble_ios_release.yml 调用，一般与
#   import-profile.sh 搭配使用。
# ============================================================

set -euo pipefail

security create-keychain -p "" build.keychain
security list-keychains -s build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain
security set-keychain-settings
echo $SIGNING_CERTIFICATE_P12_DATA | base64 --decode > signingCertificate.p12
security import signingCertificate.p12 \
                -f pkcs12 \
                -k build.keychain \
                -P $SIGNING_CERTIFICATE_PASSWORD \
                -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain