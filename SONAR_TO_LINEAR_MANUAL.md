# SonarCloud to Linear Manual Setup

## 1. Create GitHub repository secrets

Add these secrets in GitHub under Settings > Secrets and variables > Actions:

- `SONAR_TOKEN`
- `SONAR_ORG`
- `SONAR_PROJECT_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`

## 2. Confirm the Sonar config file

Make sure [.vscode/sonar-config.json](.vscode/sonar-config.json) contains your SonarCloud server, token, and project key.

## 3. Run the workflow

Push to `main` or open GitHub Actions and run the `SonarCloud to Linear` workflow manually.

## 4. What the workflow does

- Reads open SonarCloud issues for the project
- Filters to `BLOCKER`, `CRITICAL`, and `HIGH`
- Creates matching Linear issues only once per Sonar issue key
- Writes a marker into each Linear ticket so duplicates are skipped on later runs

## 5. How to use it day to day

1. Fix a Sonar issue in VS Code.
2. Push your branch.
3. Run the workflow or wait for the scheduled run.
4. Check Linear for the new ticket.
