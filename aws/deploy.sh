#!/bin/bash
# =============================================================================
# Adarsh Command Center - AWS S3 + CloudFront Deployment Script
# =============================================================================
# This script performs the INITIAL deployment of the static site to AWS:
#   1. Creates an S3 bucket configured for static website hosting
#   2. Sets the bucket policy for public read access
#   3. Uploads all site files (index.html, css/style.css, js/app.js)
#   4. Creates a CloudFront distribution pointing to the S3 website endpoint
#   5. Outputs the CloudFront domain and S3 website URL
#
# Usage:
#   ./deploy.sh                              # Uses default bucket name
#   ./deploy.sh my-custom-bucket             # Uses custom bucket name
#   AWS_REGION=eu-west-1 ./deploy.sh         # Uses custom region
#
# Prerequisites:
#   - AWS CLI v2 installed and configured (aws configure)
#   - Sufficient IAM permissions for S3 and CloudFront
# =============================================================================

set -e  # Exit immediately on any error

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BUCKET_NAME="${1:-adarsh-command-center}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No color

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
log_header "Pre-flight Checks"

# Check that AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Install it from https://aws.amazon.com/cli/"
    exit 1
fi
log_success "AWS CLI found: $(aws --version 2>&1 | head -1)"

# Check that AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "Authenticated as AWS account: $ACCOUNT_ID"

# Verify site files exist
MISSING_FILES=0
for file in "index.html" "css/style.css" "js/app.js"; do
    if [ ! -f "$PROJECT_ROOT/$file" ]; then
        log_error "Missing site file: $PROJECT_ROOT/$file"
        MISSING_FILES=1
    fi
done
if [ "$MISSING_FILES" -eq 1 ]; then
    log_error "One or more site files are missing. Aborting."
    exit 1
fi
log_success "All site files found in $PROJECT_ROOT"

echo ""
log_info "Bucket name:  ${BOLD}$BUCKET_NAME${NC}"
log_info "AWS Region:   ${BOLD}$AWS_REGION${NC}"
log_info "Project root: ${BOLD}$PROJECT_ROOT${NC}"

# ---------------------------------------------------------------------------
# Step 1: Create S3 Bucket
# ---------------------------------------------------------------------------
log_header "Step 1: Create S3 Bucket"

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    log_warn "Bucket '$BUCKET_NAME' already exists. Skipping creation."
else
    log_info "Creating bucket '$BUCKET_NAME' in region '$AWS_REGION'..."

    # ap-south-1 (and any non-us-east-1 region) requires LocationConstraint
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    log_success "Bucket '$BUCKET_NAME' created."
fi

# ---------------------------------------------------------------------------
# Step 2: Configure Static Website Hosting
# ---------------------------------------------------------------------------
log_header "Step 2: Configure Static Website Hosting"

aws s3 website "s3://$BUCKET_NAME/" \
    --index-document index.html \
    --error-document index.html

log_success "Static website hosting enabled (index: index.html, error: index.html)"

# ---------------------------------------------------------------------------
# Step 3: Disable Block Public Access (required for public bucket policy)
# ---------------------------------------------------------------------------
log_header "Step 3: Configure Public Access"

aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

log_success "Public access block settings updated."

# ---------------------------------------------------------------------------
# Step 4: Set Bucket Policy for Public Read
# ---------------------------------------------------------------------------
log_header "Step 4: Set Bucket Policy (Public Read)"

BUCKET_POLICY=$(cat <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
POLICY
)

aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy "$BUCKET_POLICY"

log_success "Bucket policy applied: public read access for all objects."

# ---------------------------------------------------------------------------
# Step 5: Upload Site Files with Correct Content Types
# ---------------------------------------------------------------------------
log_header "Step 5: Upload Site Files"

# Upload index.html
log_info "Uploading index.html..."
aws s3 cp "$PROJECT_ROOT/index.html" "s3://$BUCKET_NAME/index.html" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "max-age=300"
log_success "index.html uploaded (text/html)"

# Upload CSS
log_info "Uploading css/style.css..."
aws s3 cp "$PROJECT_ROOT/css/style.css" "s3://$BUCKET_NAME/css/style.css" \
    --content-type "text/css; charset=utf-8" \
    --cache-control "max-age=86400"
log_success "css/style.css uploaded (text/css)"

# Upload JavaScript
log_info "Uploading js/app.js..."
aws s3 cp "$PROJECT_ROOT/js/app.js" "s3://$BUCKET_NAME/js/app.js" \
    --content-type "application/javascript; charset=utf-8" \
    --cache-control "max-age=86400"
log_success "js/app.js uploaded (application/javascript)"

# Upload any other static assets if they exist (images, fonts, etc.)
if [ -d "$PROJECT_ROOT/assets" ]; then
    log_info "Uploading assets/ directory..."
    aws s3 sync "$PROJECT_ROOT/assets/" "s3://$BUCKET_NAME/assets/" \
        --cache-control "max-age=604800"
    log_success "assets/ directory synced."
fi

# ---------------------------------------------------------------------------
# Step 6: Create CloudFront Distribution
# ---------------------------------------------------------------------------
log_header "Step 6: Create CloudFront Distribution"

S3_WEBSITE_ENDPOINT="${BUCKET_NAME}.s3-website.${AWS_REGION}.amazonaws.com"

# Check if a distribution already exists for this origin
EXISTING_DIST=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='${S3_WEBSITE_ENDPOINT}'].{Id:Id,Domain:DomainName}" \
    --output text 2>/dev/null || true)

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
    log_warn "CloudFront distribution already exists for this bucket."
    CF_DOMAIN=$(echo "$EXISTING_DIST" | awk '{print $2}')
    CF_DIST_ID=$(echo "$EXISTING_DIST" | awk '{print $1}')
    log_info "Distribution ID: $CF_DIST_ID"
    log_info "Domain: $CF_DOMAIN"
else
    log_info "Creating CloudFront distribution..."
    log_info "Origin: $S3_WEBSITE_ENDPOINT"

    # Build the distribution configuration
    # We use the S3 website endpoint (not the REST endpoint) so that
    # index.html routing works correctly for the static site.
    CF_CONFIG=$(cat <<CFCONFIG
{
    "CallerReference": "adarsh-command-center-$(date +%s)",
    "Comment": "Adarsh Command Center - Static Site Distribution",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-Website-${BUCKET_NAME}",
                "DomainName": "${S3_WEBSITE_ENDPOINT}",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only",
                    "OriginSslProtocols": {
                        "Quantity": 1,
                        "Items": ["TLSv1.2"]
                    }
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-Website-${BUCKET_NAME}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponseCode": "200",
                "ResponsePagePath": "/index.html",
                "ErrorCachingMinTTL": 300
            }
        ]
    }
}
CFCONFIG
)

    CF_RESULT=$(aws cloudfront create-distribution \
        --distribution-config "$CF_CONFIG" \
        --output json)

    CF_DIST_ID=$(echo "$CF_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['Id'])")
    CF_DOMAIN=$(echo "$CF_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['DomainName'])")

    log_success "CloudFront distribution created!"
    log_info "Distribution ID: $CF_DIST_ID"
    log_info "Note: Distribution takes 5-15 minutes to fully deploy."
fi

# ---------------------------------------------------------------------------
# Step 7: Output Summary
# ---------------------------------------------------------------------------
log_header "Deployment Complete!"

S3_URL="http://${S3_WEBSITE_ENDPOINT}"
CF_URL="https://${CF_DOMAIN}"

echo -e "${BOLD}S3 Website URL:${NC}"
echo -e "  ${CYAN}${S3_URL}${NC}"
echo ""
echo -e "${BOLD}CloudFront URL:${NC}"
echo -e "  ${CYAN}${CF_URL}${NC}"
echo ""
echo -e "${BOLD}CloudFront Distribution ID:${NC}"
echo -e "  ${CF_DIST_ID}"
echo ""

# ---------------------------------------------------------------------------
# DNS Setup Instructions
# ---------------------------------------------------------------------------
log_header "DNS Setup Instructions (Custom Domain)"

echo -e "To point ${BOLD}menu.domain.com${NC} (or any subdomain) to this CloudFront distribution:"
echo ""
echo -e "${BOLD}Option A: Using Route 53 (recommended)${NC}"
echo "  1. Open Route 53 console -> Hosted zones -> your domain"
echo "  2. Create a new record:"
echo "     - Record name: menu (or your desired subdomain)"
echo "     - Record type: A"
echo "     - Toggle 'Alias' ON"
echo "     - Route traffic to: CloudFront distribution"
echo "     - Select: ${CF_DOMAIN}"
echo "  3. Also create an AAAA alias record (same steps) for IPv6 support"
echo ""
echo -e "${BOLD}Option B: Using an external DNS provider (GoDaddy, Cloudflare, etc.)${NC}"
echo "  1. Create a CNAME record:"
echo "     - Name:  menu       (or your desired subdomain)"
echo "     - Type:  CNAME"
echo "     - Value: ${CF_DOMAIN}"
echo "     - TTL:   300 (or auto)"
echo "  2. Note: CNAME cannot be used on the apex/root domain (domain.com)."
echo "     For apex domains, use Route 53 alias or Cloudflare's CNAME flattening."
echo ""
echo -e "${BOLD}SSL Certificate (for custom domain HTTPS):${NC}"
echo "  1. Open AWS Certificate Manager (ACM) in ${BOLD}us-east-1${NC} region"
echo "     (CloudFront requires certs in us-east-1, regardless of your bucket region)"
echo "  2. Request a public certificate for: menu.domain.com"
echo "  3. Validate via DNS (add the CNAME record ACM provides)"
echo "  4. Once issued, update the CloudFront distribution:"
echo "     - Edit distribution -> General -> Settings"
echo "     - Alternate domain name (CNAME): menu.domain.com"
echo "     - Custom SSL certificate: select your ACM cert"
echo "     - Save changes"
echo ""
echo -e "${BOLD}Verify:${NC}"
echo "  curl -I https://menu.domain.com"
echo ""

log_success "All done! Your Adarsh Command Center is now live on AWS."
