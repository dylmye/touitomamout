#!/bin/sh

VERSION=$(bun pm version | sed -n 's/^Current package version: v\([0-9.]*\)$/\1/p')
echo "{ \"name\": \"Touitomamout\", \"version\": \"$VERSION\" }" > ./src/buildInfo.json
