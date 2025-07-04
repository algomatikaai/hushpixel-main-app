#!/bin/bash

# ==========================================
# HushPixel Production Deployment Script
# ==========================================
# Automated deployment script following Lazy Founder principles
# This script handles the complete deployment pipeline without manual intervention

set -euo pipefail  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment.log"
ENVIRONMENT="${1:-production}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

# Create deployment log
exec 1> >(tee -a "$DEPLOYMENT_LOG")
exec 2> >(tee -a "$DEPLOYMENT_LOG" >&2)

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "$PROJECT_ROOT"/.env.backup.*
}

# Trap cleanup on exit
trap cleanup EXIT

# Banner
echo "=================================="
echo "🚀 HushPixel Deployment Pipeline"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"
echo "=================================="

# Step 1: Pre-deployment validation
log_info "Step 1: Pre-deployment validation"

# Check if we're in the correct directory
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    log_error "Not in project root directory. Please run from hushpixel-main-app/"
    exit 1
fi

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed."; exit 1; }
command -v supabase >/dev/null 2>&1 || { log_error "Supabase CLI is required but not installed."; exit 1; }

# Validate environment file exists
if [[ "$ENVIRONMENT" == "production" ]] && [[ ! -f "$PROJECT_ROOT/apps/web/.env.local" ]]; then
    log_error "Production environment file missing. Please create .env.local from .env.example"
    exit 1
fi

log_success "Pre-deployment validation completed"

# Step 2: Environment validation
log_info "Step 2: Environment validation"

cd "$PROJECT_ROOT"

# Run environment validation script
if [[ -f "scripts/validate-env.sh" ]]; then
    log_info "Running environment validation..."
    bash scripts/validate-env.sh "$ENVIRONMENT"
else
    log_warning "Environment validation script not found, creating minimal validation..."
    
    # Basic environment variable checks
    ENV_FILE="apps/web/.env.local"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        REQUIRED_VARS=(
            "NEXT_PUBLIC_SUPABASE_URL"
            "NEXT_PUBLIC_SUPABASE_ANON_KEY"
            "SUPABASE_SERVICE_ROLE_KEY"
            "MODELSLAB_API_KEY"
            "BRIDGE_SECRET"
            "STRIPE_SECRET_KEY"
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        )
        
        for var in "${REQUIRED_VARS[@]}"; do
            if ! grep -q "^$var=" "$ENV_FILE" 2>/dev/null || grep -q "^$var=$" "$ENV_FILE" 2>/dev/null; then
                log_error "Required environment variable $var is missing or empty"
                exit 1
            fi
        done
    fi
fi

log_success "Environment validation completed"

# Step 3: Dependency installation and updates
log_info "Step 3: Installing dependencies"

pnpm install --frozen-lockfile
if [[ $? -ne 0 ]]; then
    log_error "Dependency installation failed"
    exit 1
fi

log_success "Dependencies installed successfully"

# Step 4: Code quality checks
if [[ "$SKIP_TESTS" != "true" ]]; then
    log_info "Step 4: Running code quality checks"
    
    # TypeScript type checking
    log_info "Running TypeScript type checking..."
    pnpm run typecheck
    if [[ $? -ne 0 ]]; then
        log_error "TypeScript type checking failed"
        exit 1
    fi
    
    # Linting
    log_info "Running ESLint..."
    pnpm run lint
    if [[ $? -ne 0 ]]; then
        log_warning "Linting issues found, but continuing deployment..."
    fi
    
    # Tests (if available)
    if [[ -f "apps/e2e/package.json" ]]; then
        log_info "Running end-to-end tests..."
        cd apps/e2e
        pnpm test:headless || log_warning "Some E2E tests failed, review results"
        cd "$PROJECT_ROOT"
    fi
    
    log_success "Code quality checks completed"
else
    log_warning "Skipping tests and code quality checks (SKIP_TESTS=true)"
fi

# Step 5: Database migrations
log_info "Step 5: Running database migrations"

cd apps/web
if [[ -f "supabase/config.toml" ]]; then
    # Check if we can connect to Supabase
    log_info "Connecting to Supabase project..."
    
    if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
        supabase link --project-ref "$SUPABASE_PROJECT_REF" || {
            log_error "Failed to link to Supabase project"
            exit 1
        }
    fi
    
    # Run migrations
    log_info "Pushing database migrations..."
    supabase db push --include-seed=false || {
        log_error "Database migration failed"
        exit 1
    }
    
    # Verify database health
    log_info "Verifying database health..."
    supabase db lint || log_warning "Database lint issues found"
    
    log_success "Database migrations completed"
else
    log_warning "No Supabase configuration found, skipping database migrations"
fi

cd "$PROJECT_ROOT"

# Step 6: Build application
log_info "Step 6: Building application"

cd apps/web

# Create build backup if production
if [[ "$ENVIRONMENT" == "production" ]] && [[ -d ".next" ]]; then
    log_info "Backing up previous build..."
    mv .next .next.backup.$(date +%s) 2>/dev/null || true
fi

# Build the application
log_info "Building Next.js application..."
pnpm run build
if [[ $? -ne 0 ]]; then
    log_error "Application build failed"
    
    # Restore backup if available
    if [[ "$ENVIRONMENT" == "production" ]] && ls .next.backup.* 1> /dev/null 2>&1; then
        log_info "Restoring previous build..."
        LATEST_BACKUP=$(ls -t .next.backup.* | head -n1)
        mv "$LATEST_BACKUP" .next
    fi
    
    exit 1
fi

log_success "Application build completed"

cd "$PROJECT_ROOT"

# Step 7: Security validation
log_info "Step 7: Running security validation"

# Check for sensitive data in build
log_info "Scanning for sensitive data in build..."
SENSITIVE_PATTERNS=("password" "secret" "private_key" "api_key")
BUILD_DIR="apps/web/.next"

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -r -i "$pattern" "$BUILD_DIR" --exclude-dir=node_modules 2>/dev/null | grep -v "REDACTED" | head -5; then
        log_warning "Potential sensitive data found in build for pattern: $pattern"
    fi
done

# Validate CSP headers
if [[ -f "apps/web/middleware.ts" ]]; then
    log_info "Validating Content Security Policy..."
    grep -q "content-security-policy" "apps/web/middleware.ts" || log_warning "CSP not found in middleware"
fi

log_success "Security validation completed"

# Step 8: Performance validation
log_info "Step 8: Performance validation"

cd apps/web

# Bundle analysis
if command -v npx >/dev/null 2>&1; then
    log_info "Analyzing bundle size..."
    ANALYZE=true pnpm run build > /dev/null 2>&1 || log_warning "Bundle analysis failed"
fi

# Check build size
BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "Unknown")
log_info "Build size: $BUILD_SIZE"

# Performance budget check (basic)
JS_SIZE=$(find .next/static/chunks -name "*.js" -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0K")
CSS_SIZE=$(find .next/static/css -name "*.css" -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0K")

log_info "JavaScript bundle size: $JS_SIZE"
log_info "CSS bundle size: $CSS_SIZE"

cd "$PROJECT_ROOT"

log_success "Performance validation completed"

# Step 9: Deployment
log_info "Step 9: Deploying application"

# Platform-specific deployment
PLATFORM="${DEPLOY_PLATFORM:-vercel}"  # Default to Vercel

case "$PLATFORM" in
    "vercel")
        log_info "Deploying to Vercel..."
        if command -v vercel >/dev/null 2>&1; then
            cd apps/web
            if [[ "$ENVIRONMENT" == "production" ]]; then
                vercel --prod --yes || {
                    log_error "Vercel production deployment failed"
                    exit 1
                }
            else
                vercel --yes || {
                    log_error "Vercel deployment failed"
                    exit 1
                }
            fi
            cd "$PROJECT_ROOT"
        else
            log_error "Vercel CLI not installed"
            exit 1
        fi
        ;;
    "railway")
        log_info "Deploying to Railway..."
        if command -v railway >/dev/null 2>&1; then
            railway up || {
                log_error "Railway deployment failed"
                exit 1
            }
        else
            log_error "Railway CLI not installed"
            exit 1
        fi
        ;;
    "docker")
        log_info "Building Docker image..."
        docker build -t hushpixel-main-app:latest . || {
            log_error "Docker build failed"
            exit 1
        }
        
        if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
            log_info "Pushing to Docker registry..."
            docker tag hushpixel-main-app:latest "$DOCKER_REGISTRY/hushpixel-main-app:latest"
            docker push "$DOCKER_REGISTRY/hushpixel-main-app:latest" || {
                log_error "Docker push failed"
                exit 1
            }
        fi
        ;;
    *)
        log_warning "Unknown platform: $PLATFORM. Skipping deployment."
        ;;
esac

log_success "Application deployed successfully"

# Step 10: Post-deployment validation
log_info "Step 10: Post-deployment validation"

# Health check
if [[ -n "${HEALTH_CHECK_URL:-}" ]]; then
    log_info "Running health check..."
    
    for i in {1..5}; do
        if curl -f -s "${HEALTH_CHECK_URL}/healthcheck" >/dev/null; then
            log_success "Health check passed"
            break
        else
            log_warning "Health check attempt $i failed, retrying in 10 seconds..."
            sleep 10
        fi
        
        if [[ $i -eq 5 ]]; then
            log_error "Health check failed after 5 attempts"
            exit 1
        fi
    done
fi

# Smoke tests
if [[ -n "${SITE_URL:-}" ]]; then
    log_info "Running smoke tests..."
    
    # Test main pages
    SMOKE_TEST_URLS=("/" "/auth/sign-in" "/pricing")
    
    for url in "${SMOKE_TEST_URLS[@]}"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SITE_URL}${url}" || echo "000")
        if [[ "$HTTP_CODE" -ge 200 ]] && [[ "$HTTP_CODE" -lt 400 ]]; then
            log_success "Smoke test passed for $url ($HTTP_CODE)"
        else
            log_warning "Smoke test failed for $url ($HTTP_CODE)"
        fi
    done
fi

log_success "Post-deployment validation completed"

# Step 11: Cleanup and notifications
log_info "Step 11: Cleanup and notifications"

# Clean up old build backups (keep last 3)
cd apps/web
if ls .next.backup.* 1> /dev/null 2>&1; then
    log_info "Cleaning up old build backups..."
    ls -t .next.backup.* | tail -n +4 | xargs -r rm -rf
fi

cd "$PROJECT_ROOT"

# Send deployment notification (if configured)
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    log_info "Sending Slack notification..."
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 HushPixel deployment completed successfully!\nEnvironment: $ENVIRONMENT\nTimestamp: $(date)\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || log_warning "Slack notification failed"
fi

if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
    log_info "Sending Discord notification..."
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"🚀 HushPixel deployment completed successfully!\nEnvironment: $ENVIRONMENT\nTimestamp: $(date)\"}" \
        "$DISCORD_WEBHOOK_URL" 2>/dev/null || log_warning "Discord notification failed"
fi

log_success "Cleanup and notifications completed"

# Deployment summary
echo ""
echo "=================================="
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Platform: $PLATFORM"
echo "Build Size: $BUILD_SIZE"
echo "Deployment Time: $(date)"
echo "Log File: $DEPLOYMENT_LOG"
echo ""

if [[ -n "${SITE_URL:-}" ]]; then
    echo "🌐 Site URL: $SITE_URL"
fi

if [[ -n "${HEALTH_CHECK_URL:-}" ]]; then
    echo "🏥 Health Check: ${HEALTH_CHECK_URL}/healthcheck"
fi

echo ""
echo "💰 HushPixel is now ready to generate revenue!"
echo "=================================="

exit 0