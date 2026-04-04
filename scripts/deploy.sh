#!/usr/bin/env bash
# Usage: bash scripts/deploy.sh <staging|prod>
set -euo pipefail

ENV=${1:-staging}

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Error: ENV must be 'staging' or 'prod'"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploying to: $ENV"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Lambda names follow the pattern: lecsum-<function>-<env>
LAMBDAS=(
  "transcribe_trigger"
  "transcript_parser"
  "orchestrator"
)

for LAMBDA in "${LAMBDAS[@]}"; do
  FUNCTION_NAME="lecsum-${LAMBDA//_/-}-${ENV}"
  SOURCE_DIR="lambdas/${LAMBDA}"
  ZIP_FILE="/tmp/${LAMBDA}.zip"

  echo ""
  echo "▸ Packaging: $FUNCTION_NAME"

  # Install dependencies into a local package dir (Lambda layer pattern)
  if [[ -f "$SOURCE_DIR/requirements.txt" ]]; then
    pip install -r "$SOURCE_DIR/requirements.txt" \
      --target "$SOURCE_DIR/package" \
      --quiet
  fi

  # Zip: dependencies first, then handler code on top
  cd "$SOURCE_DIR"
  if [[ -d "package" ]]; then
    cd package && zip -r "$ZIP_FILE" . -x "*.pyc" -x "__pycache__/*" > /dev/null
    cd ..
  else
    zip -r "$ZIP_FILE" . -x "*.pyc" -x "__pycache__/*" > /dev/null || true
    # create empty zip if dir was empty (zip fails on empty)
    [[ -f "$ZIP_FILE" ]] || zip "$ZIP_FILE" lambda_function.py > /dev/null
  fi
  zip -g "$ZIP_FILE" lambda_function.py > /dev/null
  cd - > /dev/null

  echo "▸ Deploying: $FUNCTION_NAME"

  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://${ZIP_FILE}" \
    --region us-east-2 \
    --output text \
    --query 'FunctionName' \
    2>&1 | tail -1

  # Wait for update to complete before moving to next Lambda
  aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --region us-east-2

  echo "  ✓ $FUNCTION_NAME deployed"

  # Tag the deployment in prod for audit trail
  if [[ "$ENV" == "prod" ]]; then
    aws lambda tag-resource \
      --resource "$(aws lambda get-function --function-name "$FUNCTION_NAME" --query 'Configuration.FunctionArn' --output text)" \
      --tags "git-sha=${GITHUB_SHA:-local},deployed-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi

  # Clean up temp package dir
  rm -rf "$SOURCE_DIR/package"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy to $ENV complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
