# Alt Text Generator Action

Generates alt text for images in issue bodies.

## Usage

```yml
name: Demo
on:
  issues:
    types: [opened]

permissions:
  issues: write
  contents: read
  models: read

jobs:
  Alt-Text:
    runs-on: ubuntu-latest
    steps:
      - name: Add Alt Text
        uses: benbalter/alt-text-generator-action@main
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
