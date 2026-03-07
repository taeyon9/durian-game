#!/bin/bash
# Encode each screenshot and output as JSON for easy parsing
DIR="/Users/walter/projects/game/durian-merge/screenshots/figma_ready"

declare -A FRAMES
FRAMES["4:5"]="01-menu.jpg"
FRAMES["4:6"]="09-playing.jpg"
FRAMES["4:7"]="10-paused.jpg"
FRAMES["4:8"]="11-pause-confirm.jpg"
FRAMES["4:9"]="13-gameover-firsttime.jpg"
FRAMES["4:10"]="14-gameover-returning.jpg"
FRAMES["4:11"]="02-tutorial.jpg"
FRAMES["4:12"]="03-settings.jpg"
FRAMES["4:13"]="04-stats.jpg"
FRAMES["4:14"]="05-missions.jpg"
FRAMES["4:15"]="06-achievements.jpg"
FRAMES["4:16"]="07-daily-rewards.jpg"
FRAMES["4:17"]="08-mode-select.jpg"
FRAMES["4:18"]="15-share.jpg"
FRAMES["4:20"]="17-nickname-edit.jpg"

for nodeId in "${!FRAMES[@]}"; do
  file="${FRAMES[$nodeId]}"
  b64=$(base64 -i "$DIR/$file" | tr -d '\n')
  echo "NODE:${nodeId}:FILE:${file}:SIZE:${#b64}"
  echo "$b64" > "/tmp/figma_${nodeId//:/_}.b64"
done
echo "DONE"
