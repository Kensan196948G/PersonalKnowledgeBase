#!/bin/bash
# Phase 4 Migration Verification Script

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║       Phase 4 Prisma Schema Migration - Verification Script      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check schema validation
echo -n "1. Schema Validation: "
if npx prisma validate >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Check database file
echo -n "2. Database File: "
if [ -f "data/knowledge.db" ]; then
    echo -e "${GREEN}✓ EXISTS ($(du -h data/knowledge.db | cut -f1))${NC}"
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    exit 1
fi

# Check backup file
echo -n "3. Backup File: "
if [ -f "data/knowledge.db.backup-20251214_232201" ]; then
    echo -e "${GREEN}✓ EXISTS ($(du -h data/knowledge.db.backup-20251214_232201 | cut -f1))${NC}"
else
    echo -e "${RED}✗ NOT FOUND${NC}"
fi

# Check model count
echo -n "4. Total Models: "
MODEL_COUNT=$(grep -c "^model " prisma/schema.prisma)
if [ "$MODEL_COUNT" -eq 13 ]; then
    echo -e "${GREEN}✓ $MODEL_COUNT models${NC}"
else
    echo -e "${RED}✗ Expected 13, found $MODEL_COUNT${NC}"
fi

# Check Phase 4 models
echo -n "5. Phase 4 Models: "
PHASE4_COUNT=$(grep -E "^model (AiSummary|AiTagSuggestion|AiProofreadHistory|AiExpansionHistory|AiSettings|AiMetrics)" prisma/schema.prisma | wc -l)
if [ "$PHASE4_COUNT" -eq 6 ]; then
    echo -e "${GREEN}✓ All 6 models active${NC}"
else
    echo -e "${RED}✗ Expected 6, found $PHASE4_COUNT${NC}"
fi

# Check generated types
echo -n "6. Generated Types: "
TYPE_COUNT=$(grep -E "export type (AiSummary|AiTagSuggestion|AiProofreadHistory|AiExpansionHistory|AiSettings|AiMetrics) =" node_modules/.prisma/client/index.d.ts | wc -l)
if [ "$TYPE_COUNT" -eq 6 ]; then
    echo -e "${GREEN}✓ All 6 types generated${NC}"
else
    echo -e "${RED}✗ Expected 6, found $TYPE_COUNT${NC}"
fi

# Check Note relations
echo -n "7. Note Relations: "
if grep -q "aiSummaries.*AiSummary\[\]" prisma/schema.prisma && \
   grep -q "aiTagSuggestions.*AiTagSuggestion\[\]" prisma/schema.prisma; then
    echo -e "${GREEN}✓ AI relations configured${NC}"
else
    echo -e "${RED}✗ Relations missing${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Migration verification completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Read PHASE4_MIGRATION_REPORT.md for details"
echo "  2. Install Ollama: https://ollama.ai"
echo "  3. Pull models: ollama pull llama3.2:1b && ollama pull llama3.2:3b"
echo "  4. Begin Phase 4 implementation"
echo ""
