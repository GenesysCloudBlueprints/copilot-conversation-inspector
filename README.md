# Genesys Agent Copilot Showcase

This repository contains a Genesys Cloud Developer Blueprint that walks
through building a single-page Vue 3 + TypeScript web app — the
**Copilot Conversation Inspector** — that uses the Genesys Cloud Platform
API Client SDK to replay what **Genesys Agent Copilot** did on a given
conversation.

The full blueprint lives in [`blueprint/index.md`](blueprint/index.md). The
working sample app it documents lives in [`app/`](app/).

![README Sample picture](blueprint/images/sampleapp.png "Login Home Page for the blueprint")

## Contents

- [`blueprint/index.md`](blueprint/index.md) - The blueprint: solution
  components, prerequisites, an overview of the sample app, run-it-locally
  steps, and the implementation steps for building an equivalent app from
  scratch.
- [`blueprint/images/`](blueprint/images/) - Image references used by the
  blueprint. See [`blueprint/images/README.md`](blueprint/images/README.md)
  for the spec of each placeholder so screenshots can be added later.
- [`app/`](app/) - The Copilot Conversation Inspector sample app
  (Vue 3 + Vite + TypeScript + Tailwind CSS v4). See
  [`app/README.md`](app/README.md) for the local quick-start.

## Who is this for

Developers, solutions engineers, and CX technical leads who want a working,
end-to-end example of calling the Agent Copilot APIs from a browser app
authenticated with OAuth 2.0 Code Authorization (PKCE).

## Additional resources

- [Genesys Cloud Platform SDK - JavaScript](https://developer.genesys.cloud/api/rest/client-libraries/javascript/)
- [Create a new Genesys Agent Copilot](https://help.genesys.cloud/articles/create-a-new-genesys-agent-copilot/)
- [Genesys Cloud Developer Blueprints](https://developer.genesys.cloud/blueprints/)
