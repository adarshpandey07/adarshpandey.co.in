#!/bin/bash
# =============================================================================
# Adarsh Command Center - S3 Sync Script (for updates)
# =============================================================================
# Use this script AFTER the initial deploy.sh setup to push file updates
# to an existing S3 bucket and optionally invalidate the CloudFront cache.
#
# Usage:
#   ./sync.sh                                        # Sync to default bucket
#   ./sync.sh my-custom-bucket                       # Sync to custom bucket
#   ./sync.sh my-custom-bucket E1A2B3C4D5E6F7        # Sync + invalidate cache
#   AWS_REGION=eu-west-1 ./sync.sh                   # Custom region
#
# Prerequisites:
#   - AWS CLI v2 installed and configured
#   - S3 bucket already created via deploy.sh
# =============================================================================

set -e  # Exit immediately on any error

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BUCKET_NAME="${1:-adarsh-command-center}"
CF_DIST_ID="${2:-}"  # Optional: CloudFront distribution ID for cache invalidation
AWS_REGION="${AWS_REGION:-ap-south-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_header()  { echo -e "\n${BOLD}=== $1 ===${NC}\n"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
log_header "Adarsh Command Center - Sync to S3"

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Install it from https://aws.amazon.com/cli/"
    exit 1
fi

# Verify the bucket exists
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    log_error "Bucket '$BUCKET_NAME' does not exist. Run deploy.sh first."
    exit 1
fi

log_info "Bucket:       ${BOLD}$BUCKET_NAME${NC}"
log_info "Region:       ${BOLD}$AWS_REGION${NC}"
log_info "Project root: ${BOLD}$PROJECT_ROOT${NC}"
if [ -n "$CF_DIST_ID" ]; then
    log_info "CloudFront:   ${BOLD}$CF_DIST_ID${NC} (will invalidate cache)"
fi

# ---------------------------------------------------------------------------
# Upload files with correct content types
# ---------------------------------------------------------------------------
log_header "Syncing Files"

# Upload index.html (short cache - changes frequently)
log_info "Uploading index.html..."
aws s3 cp "$PROJECT_ROOT/index.html" "s3://$BUCKET_NAME/index.html" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "max-age=300"
log_success "index.html"

# Upload CSS (longer cache - changes less often)
log_info "Uploading css/style.css..."
aws s3 cp "$PROJECT_ROOT/css/style.css" "s3://$BUCKET_NAME/css/style.css" \
    --content-type "text/css; charset=utf-8" \
    --cache-control "max-age=86400"
log_success "css/style.css"

# Upload JavaScript (longer cache - changes less often)
log_info "Uploading js/app.js..."
aws s3 cp "$PROJECT_ROOT/js/app.js" "s3://$BUCKET_NAME/js/app.js" \
    --content-type "application/javascript; charset=utf-8" \
    --cache-control "max-age=86400"
log_success "js/app.js"

# Sync any additional assets if they exist
if [ -d "$PROJECT_ROOT/assets" ]; then
    log_info "Syncing assets/ directory..."
    aws s3 sync "$PROJECT_ROOT/assets/" "s3://$BUCKET_NAME/assets/" \
        --cache-control "max-age=604800"
    log_success "assets/ synced"
fi

# ---------------------------------------------------------------------------
# CloudFront Cache Invalidation (optional)
# ---------------------------------------------------------------------------
if [ -n "$CF_DIST_ID" ]; then
    log_header "Invalidating CloudFront Cache"

    log_info "Creating invalidation for all files (/*) ..."
    INVALIDATION_RESULT=$(aws cloudfront create-invalidation \
        --distribution-id "$CF_DIST_ID" \
        --paths "/*" \
        --output json)

    INVALIDATION_ID=$(echo "$INVALIDATION_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Invalidation']['Id'])")
    log_success "Invalidation created: $INVALIDATION_ID"
    log_info "Cache invalidation takes 1-2 minutes to propagate globally."
else
    log_header "CloudFront Cache"
    log_warn "No CloudFront distribution ID provided. Skipping cache invalidation."
    echo ""
    echo "  To invalidate the cache, pass the distribution ID as the second argument:"
    echo "    ./sync.sh $BUCKET_NAME YOUR_DISTRIBUTION_ID"
    echo ""
    echo "  Find your distribution ID with:"
    echo "    aws cloudfront list-distributions --query 'DistributionList.Items[*].{Id:Id,Domain:DomainName}' --output table"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log_header "Sync Complete!"

S3_URL="http://${BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com"

echo -e "${BOLD}S3 Website URL:${NC}"
echo -e "  ${CYAN}${S3_URL}${NC}"
echo ""

if [ -n "$CF_DIST_ID" ]; then
    echo -e "${BOLD}CloudFront cache invalidation in progress.${NC}"
    echo "  Changes will be live globally in 1-2 minutes."
else
    echo -e "Changes are immediately available at the S3 URL."
    echo "  CloudFront may serve cached content for up to 24 hours unless invalidated."
fi

echo ""
log_success "All files synced to S3."
