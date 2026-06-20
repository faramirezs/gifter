#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/unpaid-curl.sh <productId>
# Expected: HTTP/1.1 402 Payment Required
# With a PAYMENT-REQUIRED response header set by x402 middleware.

PRODUCT_ID="${1:-}"
if [ -z "$PRODUCT_ID" ]; then
  echo "Usage: $0 <productId>"
  exit 1
fi

curl -i "http://localhost:3000/api/orders/buy?productId=${PRODUCT_ID}&buyerAddress=0xBUYER"
