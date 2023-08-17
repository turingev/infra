import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type DeploysetOptions = {
  provider: k8s.Provider;
  namespace: string;
  labels?: Array<string>;
  host: string;
  port: number;
  image: string;
  issuer: k8s.apiextensions.CustomResource;
};

const pulumiComponentNamespace: string = "turingev:K8sCluster";

export class Deployset extends pulumi.ComponentResource {
  provider: k8s.Provider;
  ingress: k8s.networking.v1.Ingress;
  deployment: k8s.apps.v1.Deployment;
  service: k8s.core.v1.Service;

  constructor(
    name,
    args: DeploysetOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    const ingress = new k8s.networking.v1.Ingress(
      name,
      {
        apiVersion: "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: {
          name,
          namespace: args.namespace,
          labels: { name, host: args.host },
          annotations: {
            "cert-manager.io/cluster-issuer": args.issuer.metadata.name,
          },
        },
        spec: {
          rules: [
            {
              host: args.host,
              http: {
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                      service: {
                        name,
                        port: { number: args.port },
                      },
                    },
                  },
                ],
              },
            },
          ],
          tls: [
            {
              secretName: `${name}-cert`,
              hosts: [args.host],
            },
          ],
        },
      },
      { dependsOn: args.provider, provider: args.provider, parent: this },
    );

    const deploymnet = new k8s.apps.v1.Deployment(
      name,
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name,
          namespace: args.namespace,
          labels: { name, host: args.host },
        },
        spec: {
          selector: {
            matchLabels: { name, host: args.host },
          },
          replicas: 1,
          template: {
            metadata: {
              labels: { name, host: args.host },
            },
            spec: {
              containers: [
                {
                  image: args.image,
                  imagePullPolicy: "Always",
                  name: `${name}-1`,
                  ports: [
                    {
                      containerPort: args.port,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { dependsOn: args.provider, provider: args.provider, parent: this },
    );

    const service = new k8s.core.v1.Service(
      name,
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name,
          namespace: args.namespace,
          labels: { name, host: args.host },
        },
        spec: {
          selector: { name },
          type: "ClusterIP",
          ports: [{ name: "http", port: args.port }],
        },
      },
      { dependsOn: args.provider, provider: args.provider, parent: this },
    );

    this.ingress = ingress;
    this.deployment = deploymnet;
    this.service = service;
  }
}
