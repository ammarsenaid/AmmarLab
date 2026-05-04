# AmmarLab Local Edition - Architecture (Task 1)

## Components
- **Portal (`apps/portal`)**: Local dashboard UI for students to browse labs, detect providers, and trigger mock actions.
- **Local Agent (`apps/local-agent`)**: Node.js service on `127.0.0.1:4788` exposing mock lab control API.
- **Shared Types (`packages/shared`)**: Shared TypeScript domain types used by both portal and agent.
- **Lab Manifests (`labs/*/lab.json`)**: Local sample manifests with VM placeholders and learning instructions.

## Local-only Design
- No cloud transport, no online lab mode, no payment system, and no remote host APIs.
- Agent is loopback-bound by default (`HOST=127.0.0.1`).
- Token placeholder (`LOCAL_TOKEN`) is required in request headers.

## Future Providers
- **Hyper-V provider (future)**: Detect Hyper-V, enumerate VMs, start/stop/checkpoint operations.
- **VMware Workstation provider (future)**: Detect VMware Workstation and VM inventory, plus snapshot operations.

## Why Real Execution Is Disabled in Task 1
- Task 1 is a safe skeleton phase focused on app structure and contracts.
- `ENABLE_LOCAL_EXECUTION=false` by default and execution remains mocked even if toggled.
- This prevents accidental host modifications while UI/API workflows are validated.
