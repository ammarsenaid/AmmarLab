# AmmarLab Local Edition (Task 1 Skeleton)

## Install
```bash
npm install
```

## Run portal
```bash
npm run dev:portal
```

## Run local agent
```bash
cp apps/local-agent/.env.example apps/local-agent/.env
npm run dev:agent
```

The portal expects token `replace-with-local-token` and agent at `http://127.0.0.1:4788`.
