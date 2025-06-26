# Flux Radar UI

Flux Radar UI is the frontend and REST API component of the Flux Radar GitOps monitoring solution. It provides a dashboard for visualizing the health and status of Kubernetes and FluxCD resources across multiple clusters.

## Features

- REST API endpoint to receive resource status data from the Flux Radar agent
- Stores cluster data as JSON files in memory
- Interactive dashboard to view, filter, and search resources by cluster, type, status, and namespace
- Visual health indicators (color-coded)
- Cluster health summary

## Usage

### Development

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Start the API and UI together:**
   ```sh
   npm start
   ```

### Production

- Build the nextjs app:
  ```sh
  # local dev
  npm run dev

  # production build
  npm run build
  ```
- Serve the build and API using a process manager or Docker.

## API Endpoints

- `POST /api/data`  
  Receives cluster resource data in JSON format from the agent.

- `GET /api/clusters`  
  Lists all clusters with available data.

- `GET /api/cluster/:name`  
  Returns resource data for the specified cluster.

## Environment Variables

- `API_PORT` — Port for the REST API (default: 4000)
