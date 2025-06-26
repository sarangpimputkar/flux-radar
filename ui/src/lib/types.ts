export type ResourceStatus = "Ready" | "Reconciling" | "Error" | "Suspended" | "Unknown" | "Available" | "Active" | "Running" | "Failed";

export type Resource = {
  id: string;
  cluster: string;
  kind: "GitRepository" | "Kustomization" | "HelmRelease" | "Deployment" | "Service" | "Pod";
  resourceType: 'flux' | 'k8s';
  name: string;
  namespace: string;
  status: ResourceStatus;
  message: string;
  lastTransitionTime: string;
};

export interface ClusterData {
  clusterName: string;
  resources: Resource[];
}
