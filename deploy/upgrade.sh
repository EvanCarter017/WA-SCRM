#!/usr/bin/env bash
# Brings a machine's platform to the version of this checkout: builds the image of the servers, renews the three
# containers that are always there, and gives the server of every sub-site the new image. A sub-site's OpenWA is
# left alone, so no WhatsApp connection is interrupted. Run from anywhere, as a user that may use Docker:
#   bash deploy/upgrade.sh <the machine's settings file>
set -euo pipefail
SETTINGS=$(realpath "${1:?usage: bash deploy/upgrade.sh <settings file>}")
cd "$(dirname "$0")/.."
IMAGE=$(sed -n 's/^WA_SCRM_SERVER_IMAGE=//p' "$SETTINGS")
IMAGE=${IMAGE:-wa-scrm-server:current}
echo "building $IMAGE"
docker build -q -f deploy/Dockerfile -t "$IMAGE" . > /dev/null
docker compose -f deploy/compose.yml --env-file "$SETTINGS" up -d
for i in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' wa-scrm-provisioner 2> /dev/null)" = healthy ] && break
  sleep 2
done
# The servers of the sub-sites: one that runs is made anew by the provisioner; one that is stopped is only
# removed and gets the new image when it is started the next time.
docker ps -a --filter label=wa-scrm.part=server --format '{{.Label "wa-scrm.site"}} {{.State}}' | while read -r SITE STATE; do
  docker rm -f "wa-scrm-site-$SITE" > /dev/null
  if [ "$STATE" = running ]; then
    docker exec -e SITE="$SITE" wa-scrm-master node -e "const secret=require('fs').readFileSync('/run/wa-scrm/provisioner.secret','utf8').trim();fetch('http://wa-scrm-provisioner:8090/sites/'+process.env.SITE+'/start',{method:'POST',headers:{Authorization:'Bearer '+secret}}).then(r=>{console.log('sub-site',process.env.SITE,r.status===202?'renewed':'NOT started: '+r.status);process.exit(r.status===202?0:1)})"
  else
    echo "sub-site $SITE is stopped; it gets the new image when it is started"
  fi
done
echo "done"
