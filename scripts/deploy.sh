#!/bin/bash
set -e

ENV=${1:-staging}
REGION=${AWS_REGION:-us-east-2}

echo "Deploying to environment: $ENV"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Login to ECR once
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_BASE"

deploy_lambda() {
  local name=$1
  local dir="lambdas/$name"
  local repo_name="lecsum-${name//_/-}"
  local function_name="lecsum-${name//_/-}-${ENV}"
  local sha
  sha=$(git rev-parse --short HEAD)
  local image_tag="${ENV}-${sha}"
  local image_uri="${ECR_BASE}/${repo_name}:${image_tag}"

  echo "--- Deploying $function_name ---"

  # Build and push
  docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    --output "type=image,name=${image_uri},push=true,compression=gzip,force-compression=true" \
    "$dir"

  # Update Lambda (function must have PackageType=Image)
  aws lambda update-function-code \
    --function-name "$function_name" \
    --image-uri "$image_uri" \
    --region "$REGION" \
    --output text > /dev/null

  aws lambda wait function-updated \
    --function-name "$function_name" \
    --region "$REGION"

  aws lambda tag-resource \
    --resource "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${function_name}" \
    --tags "GitSHA=${sha},Environment=${ENV}" \
    --region "$REGION" 2>/dev/null || true

  echo "✅ $function_name deployed ($image_tag)"
}

LAMBDAS=(
  "transcript_parser"
  "router"
)

for lambda in "${LAMBDAS[@]}"; do
  deploy_lambda "$lambda"
done

echo ""
echo "✅ All Lambdas deployed to $ENV"
