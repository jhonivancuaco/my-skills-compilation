#!/usr/bin/env bash
# Checks a project against the ivan-project-structure rules.
# Usage: check-structure.sh [src-root]    (default: src)
# Exit code: 0 = clean, 1 = violations found, 2 = src root missing.

SRC="${1:-src}"
if [ ! -d "$SRC" ]; then
  echo "src root not found: $SRC" >&2
  exit 2
fi

CODE=(--include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue')
FAIL=0

section() {
  local title="$1" out="$2"
  if [ -n "$out" ]; then
    echo "FAIL  $title ($(printf '%s\n' "$out" | wc -l | tr -d ' '))"
    printf '%s\n' "$out" | sed -n '1,20s/^/      /p'
    FAIL=1
  else
    echo "ok    $title"
  fi
}

# Views must not touch the data layer. Type imports from Entities are fine.
out=""
[ -d "$SRC/Views" ] && out=$(grep -rn "${CODE[@]}" "Models/Repository" "$SRC/Views" 2>/dev/null)
section "Views import Models/Repository" "$out"

# Models must not know about screens or routes.
out=""
[ -d "$SRC/Models" ] && out=$(grep -rnE "${CODE[@]}" "from ['\"]@/(Views|Controllers|routes)" "$SRC/Models" 2>/dev/null)
section "Models import Views, Controllers or routes" "$out"

# Controllers must not contain markup.
out=""
[ -d "$SRC/Controllers" ] && out=$(find "$SRC/Controllers" \( -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.html' \) 2>/dev/null)
section "Markup files inside Controllers" "$out"

# No CSS inside Views.
out=""
if [ -d "$SRC/Views" ]; then
  out=$(find "$SRC/Views" \( -name '*.css' -o -name '*.scss' -o -name '*.sass' -o -name '*.less' -o -name '*.module.*' \) 2>/dev/null)
  vue=$(grep -rln "<style" "$SRC/Views" --include='*.vue' 2>/dev/null)
  out=$(printf '%s\n%s' "$out" "$vue" | sed '/^$/d')
fi
section "CSS inside Views" "$out"

# No literal hex colours outside the theme file.
out=$(grep -rnE "#[0-9a-fA-F]{6}\b" "$SRC" "${CODE[@]}" --include='*.css' --include='*.scss' 2>/dev/null | grep -v "Styles/theme")
section "Literal hex colours outside Styles/theme" "$out"

# One role must not import another role's partials.
out=""
if [ -d "$SRC/Views/dashboard" ]; then
  for dir in "$SRC"/Views/dashboard/*/; do
    role=$(basename "$dir")
    hits=$(grep -rnE "${CODE[@]}" "Views/dashboard/[^/'\"]+/partials" "$dir" 2>/dev/null | grep -v "Views/dashboard/$role/partials")
    [ -n "$hits" ] && out=$(printf '%s\n%s' "$out" "$hits")
  done
  out=$(printf '%s' "$out" | sed '/^$/d')
fi
section "Role imports another role's partials" "$out"

# No dumping-ground folders.
out=$(find "$SRC" -type d \( -name utils -o -name common -o -name misc -o -name lib -o -name services \) -not -path '*/node_modules/*' 2>/dev/null)
section "Dumping-ground folders (utils, common, misc, lib, services)" "$out"

# No empty folders.
out=$(find "$SRC" -type d -empty -not -path '*/node_modules/*' 2>/dev/null)
section "Empty folders" "$out"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "structure: clean"
else
  echo "structure: violations found"
fi
exit "$FAIL"
