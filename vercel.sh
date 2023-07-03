#!/bin/bash


# if VERCEL_GIT_REPO_ID is badman

if [[ $VERCEL_GIT_REPO_ID == "324732305" ]] ; then
  if [[ $VERCEL_GIT_COMMIT_REF == "main"  ]] ; then 
    echo "This is our main branch"
    cp ./apps/badman/src/manifest.prod.json ./apps/badman/src/manifest.json
    npm run build badman -- --configuration production
  else 
    echo "This is not our main branch"
    npm run build badman -- --configuration beta
  fi

# if repo id is meta

elif [[ $VERCEL_GIT_REPO_ID == "661826695" ]] ; then
  if [[ $VERCEL_GIT_COMMIT_REF == "main"  ]] ; then 
    echo "This is our main branch"
    cp ./apps/meta/src/manifest.prod.json ./apps/meta/src/manifest.json
    npm run build badman-meta -- --configuration production
  else 
    echo "This is not our main branch"
    npm run build badman-meta -- --configuration beta
  fi

else 
  echo "❌ This is not the Badman project"
  exit 1;
fi

