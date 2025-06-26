import type { Resource, ClusterData } from './types';
import { mockResources } from './mock-data';
import { publishUpdate } from './event-bus';

let resources: Resource[] = [...mockResources];

// A simple in-memory store for demo purposes.
// In a real app, you'd use a database.

export const getResources = (): Resource[] => {
  return resources;
};

export const addClusterData = (clusterData: ClusterData) => {
  const { clusterName, resources: newClusterResources } = clusterData;

  // Remove old resources from the specified cluster
  const resourcesFromOtherClusters = resources.filter(resource => resource.cluster !== clusterName);

  // Add the new resources, ensuring the cluster name is set on them
  const updatedNewResources = newClusterResources.map(r => ({ ...r, cluster: clusterName }));

  // Combine the resources from other clusters with the new resources for the specified cluster
  resources = [...resourcesFromOtherClusters, ...updatedNewResources];

  // Notify clients that the data has changed
  publishUpdate();
};
