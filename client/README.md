# ITSM Platform Client

The `client/` directory contains the React/Vite frontend for the current ITSM platform.

For the project overview, architecture, supported roles, URLs, environment configuration, verification status, and deployment instructions, see the root [README.md](../README.md) and [deployment guide](../docs/DEPLOYMENT_GUIDE.md).

## Frontend Commands

```powershell
npm ci
npm run dev
npm run typecheck
npm run build
```

The frontend uses `VITE_API_BASE_URL` for the backend API base URL. See the deployment guide for the complete placeholder environment configuration.