# The image of the platform's servers: a sub-site's server, the first server ("master") and the provisioner all
# run from it, with different commands. Build from the repository root:
#   docker build -f deploy/Dockerfile -t wa-scrm-server:current .
FROM node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54
WORKDIR /app
COPY work/wa-replica ./work/wa-replica
COPY outputs/wa-replica-prototype ./outputs/wa-replica-prototype
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:8080/api/site/status').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "work/wa-replica/serve.cjs", "8080"]
