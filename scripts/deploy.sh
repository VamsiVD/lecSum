#!/bin/bash
set -e

ENV=${1:-staging}
REGION=${AWS_REGION:-us-east-2}

echo "Deploying to environment: $ENV"

deploy_lambda() {
  local name=$1
  local dir="lambdas/$name"
  local function_name="lecsum-${name//_/-}-${ENV}"
  local tmp="/tmp/lambda-${name}-${ENV}"

  echo "--- Deploying $function_name ---"

  rm -rf "$tmp" && mkdir -p "$tmp"

  # Install dependencies if requirements.txt exists
  if [ -f "$dir/requirements.txt" ]; then
    echo "Installing dependencies for $name..."
    pip install -r "$dir/requirements.txt" -t "$tmp" --quiet
  fi

  # Copy Lambda handler on top
  cp "$dir/lambda_function.py" "$tmp/"

  # Zip it up
  cd "$tmp"
  zip -r "/tmp/${name}-${ENV}.zip" . --quiet
  cd - > /dev/null

  # Deploy
  aws lambda update-function-code \
    --function-name "$function_name" \
    --zip-file "fileb:///tmp/${name}-${ENV}.zip" \
    --region "$REGION" \
    --output text > /dev/null

  # Wait for update to complete
  aws lambda wait function-updated \
    --function-name "$function_name" \
    --region "$REGION"

  # Tag with git SHA
  local sha
  sha=$(git rev-parse --short HEAD)
  aws lambda tag-resource \
    --resource "arn:aws:lambda:${REGION}:$(aws sts get-caller-identity --query Account --output text):function:${function_name}" \
    --tags "GitSHA=${sha},Environment=${ENV}" \
    --region "$REGION" 2>/dev/null || true

  echo "✅ $function_name deployed"
}

LAMBDAS=(
  "transcribe_trigger"
  "transcript_parser"
  "router"
)

for lambda in "${LAMBDAS[@]}"; do
  deploy_lambda "$lambda"
done

echo ""
echo "✅ All Lambdas deployed to $ENV"