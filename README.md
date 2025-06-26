# Flux Radar

Flux Radar is a simple lightweight read-only dashboard to show status of your FluxCD custom resources.
It can be deployed to single k8s cluster or multiple cluster in distributed mode.
Optionally it can also collect status of k8s resources.

## Components

- flux radar ui - This is deployed central k8s cluster. It receives data from agents on HTTP(S) API , stored in memory and displays on dashboard.

- flux radar agent - This is deployed to any k8s cluster from which data need to be collected. It can be deployed to same cluster as flux radar ui and/or multiple clusters.

## Build

Build container images for ui and agent. Refer readme inside ui and agent directories.

## Deploy

```sh
# Deployment UI
kubectl apply -f ./deploy/ui.yaml

# Deploy agent
kubectl apply -f ./deploy/agent.yaml

# View Dashboard
kubectl port-forward svc/flux-radar-ui -n flux-system 8443:8443

```

## UI

- UI can be viewed locally with port forwarding
```sh
# port forward
kubectl port-forward svc/flux-radar-ui -n flux-system 8443:8443

# View Dashboard
https://localhost:8443
```

- For production purposes, expose UI using ingress controller / load balancer
