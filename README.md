# dbt-editor

`dbt-editor` is a locally hosted web app for working with dbt projects on a developer machine.

## What it does today

- Browse a local dbt project folder in the browser.
- Preview ZIP uploads as a fallback intake path.
- Edit common text files such as SQL, YAML, JSON, and TXT.
- Run a limited set of dbt commands from an in-app terminal.
- Manage adapter setup for PostgreSQL and Microsoft Fabric.
- Generate and use an app-managed `profiles.yml` for dbt runs.

## Current local setup requirements

This app assumes a real local dbt environment on the same machine as the web app.

### Core app requirements

- Node.js and npm
- a package manager or installer path for your OS

### macOS setup

This is the path currently tested most heavily.

- Homebrew
- Python 3.12
- `pipx`

### dbt requirements

The app currently uses a shared local `pipx` dbt installation.

Install:

```bash
brew install python@3.12 pipx
pipx install --python /opt/homebrew/bin/python3.12 "dbt-core==1.9.8"
pipx inject dbt-core "dbt-postgres==1.9.1" "dbt-fabric==1.9.8"
```

Verify:

```bash
/Users/$USER/.local/bin/dbt --version
```

Expected adapters at this point:

- `postgres`
- `fabric`

### Fabric requirements

For Microsoft Fabric support, the machine also needs:

- Azure CLI
- `unixodbc`
- Microsoft ODBC Driver 18 for SQL Server

Install:

```bash
brew install azure-cli unixodbc
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
HOMEBREW_ACCEPT_EULA=Y brew install msodbcsql18 mssql-tools18
```

Verify:

```bash
/opt/homebrew/bin/az version
odbcinst -q -d
```

The ODBC driver list should include:

```text
[ODBC Driver 18 for SQL Server]
```

### Windows setup

Windows does not use the Homebrew steps above.

Recommended prerequisites:

- Node.js and npm
- Python 3.12
- `pipx`
- Azure CLI
- Microsoft ODBC Driver 18 for SQL Server

Suggested install flow:

```powershell
winget install Python.Python.3.12
winget install GitHub.cli
py -m pip install --user pipx
py -m pipx ensurepath
pipx install "dbt-core==1.9.8"
pipx inject dbt-core "dbt-postgres==1.9.1" "dbt-fabric==1.9.8"
winget install Microsoft.AzureCLI
```

Install the SQL Server ODBC driver from Microsoft:

- ODBC Driver 18 for SQL Server:
  [Download for Windows](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

Verify:

```powershell
dbt --version
az version
```

Expected adapters:

- `postgres`
- `fabric`

Notes for Windows:

- the app’s generated config/profile paths are currently written with macOS paths in mind in the README examples; on Windows they will live under the user profile path used by Node on that machine
- if `dbt` is not found after `pipx install`, open a new terminal so the updated `PATH` is picked up
- if Fabric still fails after the driver install, confirm `ODBC Driver 18 for SQL Server` is present in the Windows ODBC Data Source Administrator

## Running the app locally

Install app dependencies:

```bash
npm install
```

Start the dev app:

```bash
npm run dev
```

This starts:

- the Express backend
- the Vite frontend

In development, Vite may move to a different local port if one is already in use.

## Vercel CI/CD

This repo can use Vercel for automatic frontend preview and production deployments.

What is included in this repo:

- `vercel.json` adds SPA rewrites for the Vite frontend
- the rewrite intentionally excludes `/api/*` so missing local backend routes do not get rewritten to `index.html`

What Vercel can do well here:

- preview the React frontend on pull requests
- deploy the static frontend on merges to `main`

What still requires the local app server:

- adapter setup status checks
- writing local files
- dbt terminal execution
- real local filesystem access

That means Vercel is best treated as frontend CI/CD for this project, not as a full hosted runtime for the local dbt tooling.

Recommended Vercel setup:

1. Import the GitHub repo into Vercel.
2. Let Vercel detect the Vite app.
3. Keep the default build command `vite build`.
4. Keep the output directory `dist`.
5. Enable automatic preview deployments for pull requests and production deployments from `main`.

The rewrite pattern uses Vercel's documented same-application rewrite syntax with a negative lookahead to avoid `/api/` paths:

- [Vercel rewrites documentation](https://vercel.com/docs/rewrites)

## Adapter setup behavior

The app stores adapter metadata in:

```text
~/Library/Application Support/dbt-editor/adapter-config.json
```

The app stores generated dbt profiles in:

```text
~/Library/Application Support/dbt-editor/profiles/<profile-name>/profiles.yml
```

Current behavior:

- profile arguments are auto-appended to dbt terminal commands
- secrets are not meant to be persisted in app config
- generated `profiles.yml` uses env var placeholders for secrets
- secrets are expected to be re-entered for the current app session

## Fabric CLI auth

If you use Fabric with Azure CLI authentication:

1. Run this in your normal terminal:

```bash
az login
```

2. Open the app and use `Refresh status` in adapter setup.
3. Run `Test connection`.

The app can detect whether Azure CLI is logged in, but it does not currently perform the login flow itself.

## How to use the app

1. Start the app with `npm run dev`.
2. Open the local browser URL printed by Vite.
3. Choose a real local dbt project folder.
4. Open `Configure adapter`.
5. Select an existing saved adapter config or create a new one.
6. Save the adapter setup.
7. Use `Test connection`.
8. Run dbt commands in the terminal, for example:

```bash
dbt run --select customers
dbt test
dbt seed
dbt build
```

The app automatically injects:

- `--profiles-dir`
- `--profile`
- `--target`

based on the active saved adapter config.

## Notes

- ZIP import is currently best treated as preview mode, not full execution mode.
- The terminal is intentionally limited to selected dbt commands rather than general shell access.
- This project is intended for local use on a trusted machine, not multi-user deployment.
