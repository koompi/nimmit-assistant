#!/bin/bash

# ===========================================
# Nimmit Development Startup Script
# ===========================================
# Starts all services with a single command:
#   ./scripts/dev.sh
# ===========================================

echo ""
echo "🚀 Starting Nimmit Development Environment"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOCKER_AVAILABLE=false

# Check if Docker is available
if command -v docker &> /dev/null && docker info &> /dev/null; then
    DOCKER_AVAILABLE=true
    echo -e "${GREEN}✓${NC} Docker is available"
    
    # Start Docker services (MongoDB + Redis)
    echo ""
    echo "📦 Starting database services..."
    docker compose up -d
    
    # Wait for services to be ready
    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 3
    
    # Check MongoDB
    if docker exec nimmit-mongodb mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        echo -e "${GREEN}✓${NC} MongoDB is ready (localhost:27017)"
    else
        echo -e "${YELLOW}⚠${NC} MongoDB may still be starting up..."
    fi
    
    # Check Redis
    if docker exec nimmit-redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is ready (localhost:6379)"
    else
        echo -e "${YELLOW}⚠${NC} Redis may still be starting up..."
    fi

    # Check if database needs seeding
    echo ""
    echo "🔍 Checking database..."
    USERS_COUNT=$(docker exec nimmit-mongodb mongosh nimmit --eval "db.users.countDocuments()" --quiet 2>/dev/null || echo "0")

    if [ "$USERS_COUNT" = "0" ]; then
        echo -e "${YELLOW}📋 Database is empty. Running seed script...${NC}"
        bun run seed
    else
        echo -e "${GREEN}✓${NC} Database has data (${USERS_COUNT} users)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker is not available"
    echo "   MongoDB and Redis must be running manually"
    echo ""
    echo "   To install Docker: https://docs.docker.com/get-docker/"
    echo "   Or start services manually:"
    echo "     - MongoDB: mongod --dbpath /your/data/path"
    echo "     - Redis: redis-server"
    echo ""
fi

# Start Next.js dev server
echo ""
echo "==========================================="
echo "🌐 Starting Next.js development server..."
echo "==========================================="
echo ""
echo "📧 Demo Accounts (password: password123):"
echo "   Admin:  admin@nimmit.com"
echo "   Client: john@example.com"
echo "   Worker: dara@koompi.com"
echo ""

exec bun run next dev
