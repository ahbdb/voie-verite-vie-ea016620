#!/bin/bash

# Fix html2canvas tsconfig.json to point to actual declaration files
# This script updates the include array to reference dist/types instead of non-existent src

TSCONFIG_PATH=$(find ./node_modules -path "*/html2canvas/tsconfig.json" | head -1)

if [ -f "$TSCONFIG_PATH" ]; then
  # Check if the file contains "include": ["src"] or "include": []
  if grep -q '"include".*\["src"\]' "$TSCONFIG_PATH" || grep -q '"include".*\[\]' "$TSCONFIG_PATH"; then
    # Replace with the correct path to compiled declaration files
    sed -i 's/"include".*\["src"\]/"include": ["dist\/types"]/' "$TSCONFIG_PATH"
    sed -i 's/"include".*\[\]/"include": ["dist\/types"]/' "$TSCONFIG_PATH"
    echo "Fixed html2canvas tsconfig.json to reference dist/types"
  fi
else
  echo "html2canvas tsconfig.json not found - this is okay if html2canvas is not installed"
fi

