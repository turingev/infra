import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type SSOOptions = {
  provider: k8s.Provider;
  issuer: k8s.apiextensions.CustomResource;
  host: string;
  namespace: string;
  secret: pulumi.Input<string>;
  db: {
    password: pulumi.Input<string>;
  };
};

const pulumiComponentNamespace: string = "turingev:SSO";

export class SSO extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;
  public readonly namespace: k8s.core.v1.Namespace;

  constructor(
    name: string,
    args: SSOOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        chart: "authentik",
        namespace: args.namespace,
        repositoryOpts: {
          repo: "https://charts.goauthentik.io/",
        },
        values: {
          authentik: {
            secret_key: args.secret,
            error_reporting: {
              enabled: true,
            },
            postgresql: {
              password: args.db.password,
            },
          },
          ingress: {
            enabled: true,
            tls: [
              {
                secretName: `${args.host}-cert`,
                hosts: [args.host],
              },
            ],
            annotations: {
              "cert-manager.io/cluster-issuer": args.issuer.metadata.name,
            },
            hosts: [
              {
                host: args.host,
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                  },
                ],
              },
            ],
          },
          postgresql: {
            enabled: true,
            postgresqlPassword: args.db.password,
          },
          redis: {
            enabled: true,
          },
          persistence: {
            enabled: true,
            storageClass: "longhorn",
            accessModes: ["ReadWriteOnce"],
          },
        },
        version: "1.5.1",
      },
      { dependsOn: this.namespace, provider: args.provider, parent: this },
    );
  }
}
