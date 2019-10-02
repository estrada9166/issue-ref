# Issue Ref

Reference an issue to a PR

## Create a workflow:
```yml
name: "Issue ref"

on:
  pull_request:
    types: [opened]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: estrada9166/issue-ref@v1
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```
