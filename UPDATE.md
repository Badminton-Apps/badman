# Updateting master

### <a name="submit-pr"></a> Performing a update

Before you submit your Pull Request (PR) consider the following guidelines:

1. Go to root folder and checkout masetr

```shell
git checkout master
```

2. Generate changelogs

```shell
cd code/frontend
yarn release
cd ../backend
yarn release
cd ../..
```

3. Copy markdown to assets
```shell
cp code/frontend/CHANGELOG.md code/frontend/packages/ranking-client/src/assets/changelogs/CHANGELOG-FE.md
cp code/backend/CHANGELOG.md code/frontend/packages/ranking-client/src/assets/changelogs/CHANGELOG-BE.md
```

4. Commit

```shell
git add .
PACKAGE_VERSION=$(node -p -e "require('./code/backend/lerna.json').version")
git commit -m "release: $PACKAGE_VERSION"
git tag -a v$PACKAGE_VERSION  -m "release $PACKAGE_VERSION"
git push --follow-tags
```
