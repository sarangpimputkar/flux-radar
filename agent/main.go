package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type Condition struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type ResourceStatus struct {
	Conditions []Condition `json:"conditions"`
}

type Resource struct {
	ID                 string `json:"id"`
	Kind               string `json:"kind"`
	ResourceType       string `json:"resourceType"`
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	Status             string `json:"status"`
	Message            string `json:"message"`
	LastTransitionTime string `json:"lastTransitionTime"`
}

type Payload struct {
	ClusterName string     `json:"clusterName"`
	Resources   []Resource `json:"resources"`
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}

func getNamespaces() []string {
	nsEnv := os.Getenv("NAMESPACES")
	if nsEnv == "" {
		return nil // nil means all namespaces
	}
	parts := strings.Split(nsEnv, ",")
	var namespaces []string
	for _, ns := range parts {
		ns = strings.TrimSpace(ns)
		if ns != "" {
			namespaces = append(namespaces, ns)
		}
	}
	return namespaces
}

func main() {
	interval := getEnv("INTERVAL", "120")
	controllerURL := getEnv("CONTROLLER_URL", "http://flux-radar-ui:8443/api/data")
	clusterName := getEnv("CLUSTER_NAME", "dev-cluster")
	namespaces := getNamespaces()

	intervalDur, err := time.ParseDuration(interval + "s")
	if err != nil {
		intervalDur = 120 * time.Second
	}

	config, err := rest.InClusterConfig()
	if err != nil {
		panic(err.Error())
	}
	// Uncomment the following lines if you want to use the Kubernetes clientset to fetch native resources
	// clientset, err := kubernetes.NewForConfig(config)
	// if err != nil {
	// 	panic(err.Error())
	// }
	dyn, err := dynamic.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	for {
		payload := Payload{
			ClusterName: clusterName,
			Resources:   []Resource{},
		}

		// Kubernetes native resources - uncomment to fetch native resources
		// addK8sResources(clientset, &payload, namespaces)

		// FluxCD CRDs
		addFluxResources(dyn, &payload, namespaces)

		// print for debugging
		fmt.Printf("k9s and flux Payload for %s: %+v\n", clusterName, payload)

		// Send to controller
		sendPayload(controllerURL, payload)

		time.Sleep(intervalDur)
	}
}

func addK8sResources(clientset *kubernetes.Clientset, payload *Payload, namespaces []string) {
	ctx := context.Background()
	nsList := namespaces
	if nsList == nil {
		// All namespaces
		nsList = []string{""}
	}

	for _, ns := range nsList {
		// Pods
		pods, _ := clientset.CoreV1().Pods(ns).List(ctx, metav1.ListOptions{})
		for _, pod := range pods.Items {
			status := string(pod.Status.Phase)
			message := pod.Status.Message
			lastTransitionTime := ""
			if len(pod.Status.Conditions) > 0 {
				lastTransitionTime = pod.Status.Conditions[0].LastTransitionTime.Time.Format(time.RFC3339)
			}
			payload.Resources = append(payload.Resources, Resource{
				ID:                 fmt.Sprintf("%s-pod-%s", pod.Namespace, pod.Name),
				Kind:               "Pod",
				ResourceType:       "k8s",
				Name:               pod.Name,
				Namespace:          pod.Namespace,
				Status:             status,
				Message:            message,
				LastTransitionTime: lastTransitionTime,
			})
		}

		// Services
		services, _ := clientset.CoreV1().Services(ns).List(ctx, metav1.ListOptions{})
		for _, svc := range services.Items {
			payload.Resources = append(payload.Resources, Resource{
				ID:                 fmt.Sprintf("%s-svc-%s", svc.Namespace, svc.Name),
				Kind:               "Service",
				ResourceType:       "k8s",
				Name:               svc.Name,
				Namespace:          svc.Namespace,
				Status:             "Active",
				Message:            "",
				LastTransitionTime: "",
			})
		}

		// Deployments
		deploys, _ := clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{})
		for _, dep := range deploys.Items {
			status := "Unknown"
			message := ""
			lastTransitionTime := ""
			for _, cond := range dep.Status.Conditions {
				if cond.Type == "Available" {
					status = string(cond.Type)
					message = cond.Message
					lastTransitionTime = cond.LastUpdateTime.Time.Format(time.RFC3339)
					break
				}
			}
			payload.Resources = append(payload.Resources, Resource{
				ID:                 fmt.Sprintf("%s-deploy-%s", dep.Namespace, dep.Name),
				Kind:               "Deployment",
				ResourceType:       "k8s",
				Name:               dep.Name,
				Namespace:          dep.Namespace,
				Status:             status,
				Message:            message,
				LastTransitionTime: lastTransitionTime,
			})
		}

		// StatefulSets
		sts, _ := clientset.AppsV1().StatefulSets(ns).List(ctx, metav1.ListOptions{})
		for _, s := range sts.Items {
			status := "Unknown"
			message := ""
			lastTransitionTime := ""
			for _, cond := range s.Status.Conditions {
				status = string(cond.Type)
				message = cond.Message
				lastTransitionTime = cond.LastTransitionTime.Time.Format(time.RFC3339)
				break
			}
			payload.Resources = append(payload.Resources, Resource{
				ID:                 fmt.Sprintf("%s-sts-%s", s.Namespace, s.Name),
				Kind:               "StatefulSet",
				ResourceType:       "k8s",
				Name:               s.Name,
				Namespace:          s.Namespace,
				Status:             status,
				Message:            message,
				LastTransitionTime: lastTransitionTime,
			})
		}

		// Jobs
		jobs, _ := clientset.BatchV1().Jobs(ns).List(ctx, metav1.ListOptions{})
		for _, job := range jobs.Items {
			status := "Unknown"
			message := ""
			lastTransitionTime := ""
			for _, cond := range job.Status.Conditions {
				status = string(cond.Type)
				message = cond.Message
				lastTransitionTime = cond.LastProbeTime.Time.Format(time.RFC3339)
				break
			}
			payload.Resources = append(payload.Resources, Resource{
				ID:                 fmt.Sprintf("%s-job-%s", job.Namespace, job.Name),
				Kind:               "Job",
				ResourceType:       "k8s",
				Name:               job.Name,
				Namespace:          job.Namespace,
				Status:             status,
				Message:            message,
				LastTransitionTime: lastTransitionTime,
			})
		}
	}
}

func addFluxResources(dyn dynamic.Interface, payload *Payload, namespaces []string) {
	ctx := context.Background()
	fluxResources := []struct {
		Kind string
		GVR  schema.GroupVersionResource
	}{
		{"GitRepository", schema.GroupVersionResource{Group: "source.toolkit.fluxcd.io", Version: "v1", Resource: "gitrepositories"}},
		{"Kustomization", schema.GroupVersionResource{Group: "kustomize.toolkit.fluxcd.io", Version: "v1", Resource: "kustomizations"}},
		{"HelmRelease", schema.GroupVersionResource{Group: "helm.toolkit.fluxcd.io", Version: "v2beta1", Resource: "helmreleases"}},
		{"HelmRepository", schema.GroupVersionResource{Group: "source.toolkit.fluxcd.io", Version: "v1", Resource: "helmrepositories"}},
		{"OCIRepository", schema.GroupVersionResource{Group: "source.toolkit.fluxcd.io", Version: "v1beta2", Resource: "ocirepositories"}},
		{"HelmChart", schema.GroupVersionResource{Group: "source.toolkit.fluxcd.io", Version: "v1", Resource: "helmcharts"}},
		{"ImageAutomation", schema.GroupVersionResource{Group: "image.toolkit.fluxcd.io", Version: "v1beta2", Resource: "imageautomations"}},
		{"Notification", schema.GroupVersionResource{Group: "notification.toolkit.fluxcd.io", Version: "v1beta3", Resource: "alerts"}},
	}

	nsList := namespaces
	if nsList == nil {
		// All namespaces
		nsList = []string{""}
	}

	for _, fr := range fluxResources {
		for _, ns := range nsList {
			list, err := dyn.Resource(fr.GVR).Namespace(ns).List(ctx, metav1.ListOptions{})
			if err != nil {
				continue
			}
			for _, item := range list.Items {
				name := item.GetName()
				ns := item.GetNamespace()
				status := ""
				message := ""
				lastTransitionTime := ""
				if s, found, _ := unstructuredNestedSlice(item.Object, "status", "conditions"); found {
					for _, cond := range s {
						if m, ok := cond.(map[string]interface{}); ok {
							status = fmt.Sprintf("%v", m["type"])
							message = fmt.Sprintf("%v", m["message"])
							if t, ok := m["lastTransitionTime"].(string); ok {
								lastTransitionTime = t
							}
							break
						}
					}
				}
				payload.Resources = append(payload.Resources, Resource{
					ID:                 fmt.Sprintf("%s-%s-%s", ns, strings.ToLower(fr.Kind), name),
					Kind:               fr.Kind,
					ResourceType:       "flux",
					Name:               name,
					Namespace:          ns,
					Status:             status,
					Message:            message,
					LastTransitionTime: lastTransitionTime,
				})
			}
		}
	}
}

// Helper for unstructured nested slice
func unstructuredNestedSlice(obj map[string]interface{}, fields ...string) ([]interface{}, bool, error) {
	val := obj
	for _, f := range fields[:len(fields)-1] {
		if m, ok := val[f].(map[string]interface{}); ok {
			val = m
		} else {
			return nil, false, nil
		}
	}
	last := fields[len(fields)-1]
	if s, ok := val[last].([]interface{}); ok {
		return s, true, nil
	}
	return nil, false, nil
}

func sendPayload(url string, payload Payload) {
	b, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(b))
	if err != nil {
		fmt.Println("Failed to create request:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	var client *http.Client

	if strings.HasPrefix(url, "https://") {
		insecureSkipVerify := os.Getenv("INSECURE_SKIP_VERIFY") == "true"
		tlsConfig := &tls.Config{}
		if insecureSkipVerify {
			tlsConfig.InsecureSkipVerify = true
		} else {
			rootCAs, err := x509.SystemCertPool()
			if err != nil {
				fmt.Println("Failed to load system root CAs:", err)
				return
			}
			tlsConfig.RootCAs = rootCAs
		}
		transport := &http.Transport{TLSClientConfig: tlsConfig}
		client = &http.Client{Transport: transport}
	} else {
		client = &http.Client{}
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Failed to send payload:", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		fmt.Printf("Controller returned %d: %s\n", resp.StatusCode, string(body))
	}
}
