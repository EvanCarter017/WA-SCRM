#!/usr/bin/env bash
# Brings a machine's platform to the version of this checkout — the first time as well: builds the image of the
# servers, renews the three containers that are always there (the gateway also when only its configuration
# changed), fetches the image of OpenWA when the machine does not have it, and gives the server of every
# sub-site the new image. A sub-site's OpenWA is left alone, so no WhatsApp connection is interrupted.
# Run from anywhere, as a user that may use Docker:
#   bash deploy/upgrade.sh <the machine's settings file>
set -euo pipefail
SETTINGS=$(realpath "${1:?usage: bash deploy/upgrade.sh <settings file>}")
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f deploy/compose.yml --env-file "$SETTINGS")
IMAGE=$(sed -n 's/^WA_SCRM_SERVER_IMAGE=//p' "$SETTINGS")
IMAGE=${IMAGE:-wa-scrm-server:current}
# The gateway's configuration is tried before anything is changed: one with an error stops the upgrade here.
GATEWAY_IMAGE=$(sed -n 's/^    image: \(nginx:[^ ]*\)$/\1/p' deploy/compose.yml)
docker run --rm --entrypoint nginx -v "$PWD/deploy/gateway.conf:/etc/nginx/nginx.conf:ro" "$GATEWAY_IMAGE" -t -q || { echo "deploy/gateway.conf has an error: nothing was changed" >&2; exit 1; }
echo "building $IMAGE"
docker build -q -f deploy/Dockerfile -t "$IMAGE" . > /dev/null
"${COMPOSE[@]}" up -d
# The gateway reads its configuration when it starts: a container that still has an older one is made anew, and
# one whose file was changed in place is told to read it again.
if ! docker exec wa-scrm-gateway cat /etc/nginx/nginx.conf | cmp -s - deploy/gateway.conf; then
  echo "the gateway gets its new configuration"
  "${COMPOSE[@]}" up -d --force-recreate gateway
else
  docker exec wa-scrm-gateway nginx -s reload || echo "the gateway could NOT read its configuration again" >&2
fi
healthy() { [ "$(docker inspect -f '{{.State.Health.Status}}' wa-scrm-provisioner 2> /dev/null)" = healthy ]; }
for i in $(seq 1 60); do
  healthy && break
  sleep 2
done
# Nothing of a sub-site is touched unless the provisioner is there to put it right again.
healthy || { echo "the provisioner is not healthy: the sub-sites are left as they are" >&2; exit 1; }
# The provisioner makes containers, it fetches no image: the one of OpenWA is fetched here when it is missing.
OPENWA=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' wa-scrm-provisioner | sed -n 's/^WA_SCRM_OPENWA_IMAGE=//p')
docker image inspect "$OPENWA" > /dev/null 2>&1 || { echo "fetching $OPENWA"; docker pull -q "$OPENWA" > /dev/null; }
# The sub-sites, each known by its OpenWA. Where that runs, the server is made anew by the provisioner — also a
# server that an earlier run of this script took away and could not bring back. Where it is stopped, the server
# is only removed and gets the new image when the sub-site is started the next time. A sub-site that cannot be
# started does not keep the others waiting: the script then ends with an error, and can be run again.
# A new server counts once it answers, as the image's own health check finds.
answers() { [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "wa-scrm-site-$1" 2> /dev/null)" = healthy ]; }
LEFT=0
while read -r SITE STATE; do
  [[ "$SITE" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || continue
  docker rm -f "wa-scrm-site-$SITE" > /dev/null 2>&1 || true
  # A server that could not be taken away would be started again as it is, with the old image.
  if docker inspect "wa-scrm-site-$SITE" > /dev/null 2>&1; then echo "sub-site $SITE: its old server could NOT be removed" >&2; LEFT=1; continue; fi
  if [ "$STATE" != running ] && [ "$STATE" != restarting ]; then
    echo "sub-site $SITE is stopped; it gets the new image when it is started"
    continue
  fi
  docker exec -e SITE="$SITE" wa-scrm-master node -e "const secret=require('fs').readFileSync('/run/wa-scrm/provisioner.secret','utf8').trim();fetch('http://wa-scrm-provisioner:8090/sites/'+process.env.SITE+'/start',{method:'POST',headers:{Authorization:'Bearer '+secret}}).then(r=>{if(r.status!==202)console.error('sub-site',process.env.SITE,'was NOT started: the provisioner answered',r.status);process.exit(r.status===202?0:1)},()=>{console.error('sub-site',process.env.SITE,'was NOT started: the provisioner did not answer');process.exit(1)})" < /dev/null || { LEFT=1; continue; }
  for i in $(seq 1 90); do
    answers "$SITE" && break
    sleep 2
  done
  if answers "$SITE"; then echo "sub-site $SITE renewed"; else echo "sub-site $SITE: its new server does NOT answer" >&2; LEFT=1; fi
done < <(docker ps -a --filter label=wa-scrm.part=openwa --format '{{.Label "wa-scrm.site"}} {{.State}}')
[ "$LEFT" = 0 ] || { echo "not every sub-site was started again: see above, then run this script once more" >&2; exit 1; }
echo "done"
