#!/bin/bash

# Test script for the GraphQL API

API_URL="http://localhost:4000/graphql"

echo "Testing Health Check..."
curl -s http://localhost:4000/health | jq .

echo -e "\n\nTesting GraphQL API - Register User..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(email: \"test@example.com\", password: \"test123\", displayName: \"Test User\") { token user { id email displayName } } }"
  }' | jq .

echo -e "\n\nTesting GraphQL API - Login..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"test@example.com\", password: \"test123\") { token user { id email displayName } } }"
  }' | jq .

echo -e "\n\nAPI Tests Complete!"

