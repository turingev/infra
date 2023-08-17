import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { provider } from ".";

export type CertManagerOptions = {
  replicas?: pulumi.Input<number>;
  namespaceName: pulumi.Input<string>;
  helmChartVersion: pulumi.Input<string>;
  provider: k8s.Provider;
  iamRoleArn?: pulumi.Input<string>;
  hostAliases?: k8s.types.input.core.v1.HostAlias[];
};

const pulumiComponentNamespace: string = "turingev:CertManager";

export class CertManager extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;
  public readonly namespace: k8s.core.v1.Namespace;

  constructor(
    name: string,
    args: CertManagerOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.namespace = new k8s.core.v1.Namespace(
      "cert-manager",
      {
        metadata: { name: "cert-manager" },
      },
      { provider: provider, parent: this },
    );

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        namespace: args.namespaceName,
        chart: "cert-manager",
        version: args.helmChartVersion || "v1.0.3",
        repositoryOpts: {
          repo: "https://charts.jetstack.io",
        },
        values: {
          installCRDs: true,
          livenessProbe: {
            enabled: true,
          },
        },
      },
      { provider: args.provider, dependsOn: this.namespace, parent: this },
    );
  }
}
