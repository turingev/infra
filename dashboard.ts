import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type DashboardOptions = {
  provider: k8s.Provider;
  namespaceName: string;
  issuer: k8s.apiextensions.CustomResource;
  host: string;
};

const pulumiComponentNamespace: string = "turingev:Dashboard";

export class Dasboard extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;
  public readonly namespace: k8s.core.v1.Namespace;

  constructor(
    name: string,
    args: DashboardOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.namespace = new k8s.core.v1.Namespace(
      args.namespaceName,
      {
        metadata: { name: args.namespaceName },
      },
      { provider: args.provider, parent: this },
    );

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        chart: "kubernetes-dashboard",
        namespace: this.namespace.metadata.name,
        repositoryOpts: {
          repo: "https://kubernetes.github.io/dashboard/",
        },
        values: {
          ingress: {
            enabled: true,
            hosts: [args.host],
            annotations: {
              "cert-manager.io/cluster-issuer": args.issuer.metadata.name,
            },
            tls: [
              {
                secretName: `${args.host}-cert`,
                hosts: [args.host],
              },
            ],
          },
          service: {
            externalPort: 443,
          },

          // for v3 major release
          // issuer: {
          //   scope: "cluster",
          //   name: args.issuer.metadata.name,
          // },
          // nginx: {
          //   enabled: false,
          // },
          // "cert-manager": {
          //   enabled: false,
          // },
        },
        version: "6.0.8",
      },
      { dependsOn: this.namespace, provider: args.provider, parent: this },
    );
  }
}
