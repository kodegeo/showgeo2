#!/bin/bash

# Script to fix Prisma model names across the codebase
# Run from backend directory

echo "Fixing Prisma model references..."

# Replace prisma.user → prisma.app_users
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.user\./prisma.app_users./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.users\./prisma.app_users./g' {} \;

# Replace prisma.userProfile → prisma.user_profiles
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.userProfile\./prisma.user_profiles./g' {} \;

# Replace prisma.entity → prisma.entities
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.entity\./prisma.entities./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.entities\./prisma.entities./g' {} \;

# Replace prisma.entityRole → prisma.entity_roles
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.entityRole\./prisma.entity_roles./g' {} \;

# Replace prisma.event → prisma.events
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.event\./prisma.events./g' {} \;

# Replace prisma.store → prisma.stores
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.store\./prisma.stores./g' {} \;

# Replace prisma.product → prisma.products
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.product\./prisma.products./g' {} \;

# Replace prisma.ticket → prisma.tickets
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.ticket\./prisma.tickets./g' {} \;

# Replace prisma.streamingSession → prisma.streaming_sessions
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.streamingSession\./prisma.streaming_sessions./g' {} \;

# Replace prisma.follow → prisma.follows
find src -name "*.ts" -type f -exec sed -i '' 's/prisma\.follow\./prisma.follows./g' {} \;

echo "Done fixing Prisma model references."





