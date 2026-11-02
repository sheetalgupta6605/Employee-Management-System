# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Connecting to the backend

The frontend sends API requests to `VITE_API_URL` in `frontend/.env`. The local
default is `http://127.0.0.1:8000`; change it to the address where FastAPI is
running, then restart the Vite dev server. Endpoint paths are resolved relative
to this base URL, so a base URL that includes a prefix such as `/api` is also
supported.

Sign-in uses the same email-and-password form for all accounts. The backend
determines whether the account is an administrator or employee. Employee
sign-up is available after an administrator creates that employee's record.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
