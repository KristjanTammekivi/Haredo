set -x
set -e

cd "$(dirname "$0")"

if [ -z "$1" ]; then
    echo "usage: $0 <package> <patch|minor|major>"
    exit 1
fi

if [ ! -d "packages/$1" ]; then
    echo "Error: $1 is not a valid package"
    exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

if [ $2 != "patch" -a $2 != "minor" -a $2 != "major" ]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

yarn --cwd packages/$1 version --$2 --no-git-tag-version
VERSION=$(node -p "require('./packages/$1/package.json').version")
TAG="$1@$VERSION"
git add packages/$1/package.json
git commit -m "chore: Release $TAG"
git tag -a $TAG -m "Release $TAG"
yarn exec -- auto-changelog \
  --tag-prefix $1@ \
  --append-git-log "packages/$1/" \
  --output packages/$1/CHANGELOG.md \
  --ignore-commit-pattern '(^chore|dependabot)' \
  --starting-date 2023-11-16 \
  --commit-limit false
git add packages/$1/CHANGELOG.md
git commit --amend --no-edit
git tag -a $TAG -f -m "Release $TAG"
git push
git push origin $TAG