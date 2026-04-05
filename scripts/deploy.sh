#!/usr/bin/env bash
# Usage: bash scripts/deploy.sh <staging|prod>
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
export AWS_PAGER=""

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

  if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --output json &>/dev/null; then
    echo ""
    echo "  ✗ Cannot read Lambda function: $FUNCTION_NAME (region $REGION)"
    aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --output json 2>&1 || true
    echo ""
    echo "  If you see ResourceNotFoundException, create the function in AWS first (name above,"
    echo "  runtime Python 3.x, handler lambda_function.lambda_handler), then redeploy."
    exit 1
  fi

  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://${ZIP_FILE}" \
    --region "$REGION" \
    --output text \
    --query 'FunctionName' \
    --no-cli-pager

  # Wait for update to complete before moving to next Lambda
  aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION"

  echo "  ✓ $FUNCTION_NAME deployed"

  # Tag the deployment in prod for audit trail
  if [[ "$ENV" == "prod" ]]; then
    FN_ARN=$(aws lambda get-function \
      --function-name "$FUNCTION_NAME" \
      --region "$REGION" \
      --query 'Configuration.FunctionArn' \
      --output text)
    aws lambda tag-resource \
      --region "$REGION" \
      --resource "$FN_ARN" \
      --tags "git-sha=${GITHUB_SHA:-local},deployed-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi

  # Clean up temp package dir
  rm -rf "$SOURCE_DIR/package"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy to $ENV complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
