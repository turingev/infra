import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type DeploysetOptions = {
  provider: k8s.Provider;
  namespace: pulumi.Input<string>;
  labels?: Array<string>;
  host: pulumi.Input<string>;
  port: pulumi.Input<number>;
  image: pulumi.Input<string>;
  env?: Array<{
    name: pulumi.Input<string>;
    value?: pulumi.Input<string>;
  }>;
  replicas?: pulumi.Input<number>;
  issuer: k8s.apiextensions.CustomResource;
};

const pulumiComponentNamespace: string = "turingev:Deployset";

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

    const deployment = new k8s.apps.v1.Deployment(
      `${name}-deployment`,
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
          replicas: args.replicas ?? 2,
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
                  env: args.env,
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
      `${name}-service`,
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
      { dependsOn: deployment, provider: args.provider, parent: this },
    );

    const ingress = new k8s.networking.v1.Ingress(
      `${name}-ingress`,
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
      { dependsOn: service, provider: args.provider, parent: this },
    );

    this.deployment = deployment;
    this.service = service;
    this.ingress = ingress;
  }
}
