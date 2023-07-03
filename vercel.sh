#!/bin/bash
 
if [[ $VERCEL_GIT_COMMIT_REF == "main"  ]] ; then 
  echo "This is our main branch"
  cp ./apps/badman/src/manifest.prod.json ./apps/badman/src/manifest.json
  npm run build badman -- --configuration production
else 
  echo "This is not our main branch"
  npm run build badman -- --configuration beta
fi