#!/bin/bash

echo "VERCEL_GIT_COMMIT_MESSAGE: $VERCEL_GIT_COMMIT_MESSAGE"
echo "VERCEL_GIT_COMMIT_REF $VERCEL_GIT_COMMIT_REF"

# if the message doens't have chore(xxx) on the main or develop branch, then we want to skip the build
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]] || [[ "$VERCEL_GIT_COMMIT_REF" == "develop" ]] ; then
 
  if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"chore(release)"* ]] ; then
    # Proceed with the build
    echo "✅ - Build can proceed"
    exit 1;
  else
    # Don't build
    echo "🛑 - Build cancelled"
    exit 0;
  fi

else
  # Proceed with the build
  echo "✅ - Build can proceed"
  exit 1;
fi


