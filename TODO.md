# Dataset pipeline TODO

- [x] pintail-ds scaffold: manifest/alias scheme, sha256-verifying fetch script
- [x] smoke dataset published (hash 248ae39a6042a9f3, 0.6 MB, in-repo)
- [ ] ci dataset published (1%, generating — commit on completion)
- [x] 1. `--dataset <alias>` mode in pintail's `benchmark/run-production.ts`:
      fetch via manifest → decompress → `LOAD DATA INFILE` (FK/unique checks off,
      binlog off) → secondary indexes created after load (single ALTER per table)
      → query-parameter metadata reconstructed from the loaded data
- [x] 2. Release-asset storage for large tiers: `publish-dataset.ts --store release`
      uploads to a `ds-<workload>-<hash>` GitHub release on pintail-ds, chunking
      files > 1.9 GB into parts; `fetch.ts` reassembles and verifies parts
- [ ] 3. R2 mirror in manifest `urls` (deferred by owner decision — additive,
      no consumer changes when added)
- [ ] full-tier dataset generation + release publish (hours; run on the docker host
      co-located, release-gate cadence)
- [ ] CI wiring in pintail: per-merge job runs `run-production.ts --profile ci
      --dataset ci`; full profile on release tags
- [ ] parallel per-table LOAD DATA (loader currently sequential; ~2-3× at full scale)
