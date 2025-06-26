
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  PauseCircle,
  HelpCircle,
  GitBranch,
  Box,
  Package,
  Server,
  Network,
  Container,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Radar
} from 'lucide-react';
import type { Resource, ResourceStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const readyStyle = { icon: CheckCircle2, color: '#22c55e', class: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800/60' };
const errorStyle = { icon: XCircle, color: '#ef4444', class: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800/60' };
const suspendedStyle = { icon: PauseCircle, color: '#f59e0b', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/60' };


const STATUS_MAP: Record<ResourceStatus, { icon: React.ElementType, color: string, class: string }> = {
  Ready: readyStyle,
  Available: readyStyle,
  Active: readyStyle,
  Running: readyStyle,
  Reconciling: { icon: RefreshCw, color: '#3b82f6', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/60' },
  Error: errorStyle,
  Failed: errorStyle,
  Suspended: suspendedStyle,
  Unknown: { icon: HelpCircle, color: '#6b7280', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600' },
};

const KIND_ICON_MAP: Record<Resource['kind'], React.ElementType> = {
    GitRepository: GitBranch,
    Kustomization: Box,
    HelmRelease: Package,
    Deployment: Server,
    Service: Network,
    Pod: Container,
};

type SortConfig = { key: keyof Resource | null; direction: 'ascending' | 'descending' };

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    cluster: 'all',
    resourceType: 'all',
    status: 'all',
    namespace: 'all',
    kind: 'all',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const StatusBadge = ({ status }: { status?: ResourceStatus | string }) => {
    const effectiveStatus: ResourceStatus = (status && STATUS_MAP[status as ResourceStatus]) ? status as ResourceStatus : 'Unknown';
    const { icon: Icon, class: className } = STATUS_MAP[effectiveStatus];
    const isReconciling = effectiveStatus === 'Reconciling';
    
    return (
      <Badge variant="outline" className={cn("py-1 px-2 border", className)}>
        <Icon className={cn("mr-1.5 h-3.5 w-3.5", isReconciling && "animate-spin")} />
        <span className="font-medium">{status || 'Unavailable'}</span>
      </Badge>
    );
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/resources');
      const data = await res.json();
      setResources(data);
    } catch (e) {
      console.error("Failed to fetch resources", e);
    } finally {
      setIsLoading(false);
    }
  };

  const autoRefreshData = async () => {
    try {
      const res = await fetch('/api/resources');
      const data = await res.json();
      setResources(data);
    } catch (e) {
      console.error("Failed to fetch resources on auto-refresh", e);
    }
  };

  useEffect(() => {
    fetchData();

    const eventSource = new EventSource('/api/updates');
    eventSource.onmessage = () => {
      autoRefreshData();
    };
    eventSource.onerror = (err) => {
        // The browser will automatically attempt to reconnect on failure,
        // so we don't need to add custom logic here.
        // We can log this for debugging if needed, but it's often noisy.
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const uniqueClusters = useMemo(() => ['all', ...new Set(resources.map(r => r.cluster))], [resources]);
  const uniqueNamespaces = useMemo(() => ['all', ...Array.from(new Set(resources.map(r => r.namespace))).sort()], [resources]);
  const uniqueKinds = useMemo(() => ['all', ...Array.from(new Set(resources.map(r => r.kind))).sort()], [resources]);

  const filteredOnlyResources = useMemo(() => {
    return resources.filter(resource => {
      return (
        (filters.cluster === 'all' || resource.cluster === filters.cluster) &&
        (filters.resourceType === 'all' || resource.resourceType === filters.resourceType) &&
        (filters.status === 'all' || resource.status === filters.status) &&
        (filters.namespace === 'all' || resource.namespace === filters.namespace) &&
        (filters.kind === 'all' || resource.kind === filters.kind) &&
        (resource.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [resources, searchTerm, filters]);


  const filteredResources = useMemo(() => {
    if (!sortConfig.key) {
      return filteredOnlyResources;
    }
    
    // Create a new array to avoid in-place sorting of a memoized value
    return [...filteredOnlyResources].sort((a, b) => {
      const key = sortConfig.key!;
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      const comparison = String(valA).localeCompare(String(valB));
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

  }, [filteredOnlyResources, sortConfig]);

  const paginatedResources = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResources.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResources, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / itemsPerPage));

  const handleFilterChange = (filterName: keyof typeof filters) => (value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };
  
  const requestSort = (key: keyof Resource) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const overviewData = useMemo(() => {
    const data = resources.reduce((acc, resource) => {
      const clusterName = resource.cluster;
      if (!acc[clusterName]) {
        const initialCounts = Object.keys(STATUS_MAP).reduce((sAcc, s) => {
          sAcc[s as ResourceStatus] = 0;
          return sAcc;
        }, {} as Record<ResourceStatus, number>);
        
        acc[clusterName] = { counts: { ...initialCounts, Total: 0 }, latestTimestamp: null };
      }

      const status: ResourceStatus = (resource.status && STATUS_MAP[resource.status as ResourceStatus]) ? resource.status as ResourceStatus : 'Unknown';
      if (acc[clusterName].counts.hasOwnProperty(status)) {
        acc[clusterName].counts[status]++;
      } else {
        acc[clusterName].counts['Unknown']++;
      }
      acc[clusterName].counts.Total++;

      if (resource.lastTransitionTime) {
          const currentLatest = acc[clusterName].latestTimestamp;
          if (!currentLatest || new Date(resource.lastTransitionTime) > new Date(currentLatest)) {
              acc[clusterName].latestTimestamp = resource.lastTransitionTime;
          }
      }

      return acc;
    }, {} as Record<string, { counts: Record<ResourceStatus | 'Total', number>, latestTimestamp: string | null }>);

    return Object.entries(data);
  }, [resources]);


  const SortableHeader = ({ tKey, label }: { tKey: keyof Resource, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(tKey)} className="px-2 py-1 h-auto">
        {label}
        {sortConfig.key === tKey && (sortConfig.direction === 'ascending' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
      </Button>
    </TableHead>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Radar className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold text-foreground">FluxRadar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Cluster Overview</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-48 mt-4" />
                  </CardContent>
                </Card>
              ))
            ) : (
              overviewData.map(([clusterName, { counts, latestTimestamp }]) => (
                <Card key={clusterName}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-medium">{clusterName}</CardTitle>
                    <Server className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-base font-bold">{counts.Total} Resources</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 pt-2 text-xs text-muted-foreground">
                      {Object.entries(STATUS_MAP).map(([status, {color}]) => counts[status as ResourceStatus] > 0 && (
                        <div key={status} className="flex items-center">
                          <span className="w-2 h-2 rounded-full mr-1.5" style={{backgroundColor: color}}></span>
                          {counts[status as ResourceStatus]} {status}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-4" suppressHydrationWarning>
                      Last update: {latestTimestamp ? new Date(latestTimestamp).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>All Resources</CardTitle>
              <div className="py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="lg:col-span-2"
                  disabled={isLoading}
                />
                 <Select value={filters.cluster} onValueChange={handleFilterChange('cluster')} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Filter by Cluster" /></SelectTrigger>
                  <SelectContent>{uniqueClusters.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Clusters' : c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.resourceType} onValueChange={handleFilterChange('resourceType')} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="flux">FluxCD</SelectItem>
                    <SelectItem value="k8s">Kubernetes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.namespace} onValueChange={handleFilterChange('namespace')} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Filter by Namespace" /></SelectTrigger>
                  <SelectContent>
                    {uniqueNamespaces.map(ns => <SelectItem key={ns} value={ns}>{ns === 'all' ? 'All Namespaces' : ns}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.kind} onValueChange={handleFilterChange('kind')} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Filter by Kind" /></SelectTrigger>
                  <SelectContent>
                    {uniqueKinds.map(k => <SelectItem key={k} value={k}>{k === 'all' ? 'All Kinds' : k}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={filters.status} onValueChange={handleFilterChange('status')} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader tKey="kind" label="Kind" />
                      <SortableHeader tKey="name" label="Name" />
                      <SortableHeader tKey="namespace" label="Namespace" />
                      <SortableHeader tKey="status" label="Status" />
                      <TableHead>Last Update</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Loading resources...
                        </TableCell>
                      </TableRow>
                    ) : paginatedResources.length > 0 ? (
                      paginatedResources.map(resource => {
                        const KindIcon = KIND_ICON_MAP[resource.kind] || Box;
                        return (
                          <TableRow key={resource.id}>
                            <TableCell className="font-medium">
                                <div className='flex items-center gap-2'>
                                    <KindIcon className="h-4 w-4 text-muted-foreground"/>
                                    <span>{resource.kind}</span>
                                </div>
                            </TableCell>
                            <TableCell>{resource.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{resource.namespace}</Badge>
                            </TableCell>
                            <TableCell><StatusBadge status={resource.status} /></TableCell>
                            <TableCell suppressHydrationWarning>
                              {resource.lastTransitionTime
                                ? formatDistanceToNow(new Date(resource.lastTransitionTime), { addSuffix: true })
                                : 'Unavailable'}
                            </TableCell>
                            <TableCell>
                              {/* Actions removed */}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between space-x-2 py-4">
                 <div className="flex-1 text-sm text-muted-foreground">
                    {!isLoading && <>{filteredResources.length} total resources.</>}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                      value={`${itemsPerPage}`}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={itemsPerPage} />
                      </SelectTrigger>
                      <SelectContent side="top">
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <span className="sr-only">Go to first page</span>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <span className="sr-only">Go to previous page</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      <span className="sr-only">Go to next page</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      <span className="sr-only">Go to last page</span>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
