# Flux Radar Agent

Flux Radar Agent is a lightweight Go microservice that collects the status of FluxCD resources ( and optionally Kubernetes native resources) from the cluster it runs on. It periodically sends this data to the Flux Radar Dashboard for centralized monitoring and visualization.

## Features

- Collects status for:
  - FluxCD custom resources: HelmRelease, Kustomization, GitRepository, HelmRepository, OCIRepository, HelmChart, Notification, ImageAutomation
  - Optionally -  Kubernetes native resources: Pods, Nodes, Services, Deployments, StatefulSets, Jobs (uncomment this in main.go if required)
- Sends resource status as JSON to the controller via REST API
- Configurable collection interval and controller endpoint
- Supports secure HTTPS communication with trusted or custom CA certificates
- Optionally allows skipping certificate verification for development/testing
- **NEW:** Option to search only selected namespaces for both FluxCD and Kubernetes resources

## Configuration

The agent is configured via environment variables:

| Variable                | Description                                                      | Default                      |
|-------------------------|------------------------------------------------------------------|------------------------------|
| `CLUSTER_NAME`          | Name of the cluster (used in payload and file naming)            | `dev-cluster`                |
| `INTERVAL`              | Collection interval in seconds                                   | `120`                        |
| `CONTROLLER_URL`        | REST API endpoint of the controller                              | `https://flux-radar-ui:8443/api/data` |
| `INSECURE_SKIP_VERIFY`  | If `true`, skips SSL certificate verification (not recommended)  | `false`                      |
| `NAMESPACES`            | Comma-separated list of namespaces to search for resources. If unset or empty, all namespaces are searched. | (all namespaces)             |

## Usage

### Build

```sh
go build -o flux-radar-agent main.go
```

### Run

```sh
export CLUSTER_NAME=my-cluster
export CONTROLLER_URL=https://your-controller/api/cluster
export INTERVAL=120
export INSECURE_SKIP_VERIFY=false
export NAMESPACES=default,flux-system,monitoring
./flux-radar-agent
```

### Docker

Build the Docker image:

```sh
docker build -t flux-radar-agent .
```

Run the container:

```sh
docker run --env CLUSTER_NAME=my-cluster --env CONTROLLER_URL=http://flux-radar-ui:8080/api/data --env NAMESPACES=default,flux-system flux-radar-agent
```

## Security

- For production, use trusted CA certificates for HTTPS communication.
- To add a custom CA, copy your `.crt` file into the image and run `update-ca-certificates`.
- Only set `INSECURE_SKIP_VERIFY=true` for development or testing.
