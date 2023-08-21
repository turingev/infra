import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type MailuOptions = {
  provider: k8s.Provider;
  domain: string;
  initialAccount?: {
    domain?: string;
    username?: string;
    password?: string;
  };
  namespaceName: string;
};

const pulumiComponentNamespace: string = "turingev:Mailu";

export class Mailu extends pulumi.ComponentResource {
  provider: k8s.Provider;

  constructor(name, args: MailuOptions, opts) {
    super(pulumiComponentNamespace, name, {}, opts);

    const mailuNamespace = new k8s.core.v1.Namespace(
      args.namespaceName,
      {
        metadata: { name: args.namespaceName },
      },
      { dependsOn: args.provider, provider: args.provider, parent: this },
    );

    const mailuChart = new k8s.helm.v3.Release(
      name,
      {
        chart: "mailu",
        namespace: mailuNamespace.metadata.name,
        repositoryOpts: {
          repo: "https://mailu.github.io/helm-charts",
        },
        values: {
          domain: args.domain,
          hostnames: [args.domain],
          initialAccount: {
            domain: args.initialAccount?.domain ?? args.domain,
            username: args.initialAccount?.username ?? "admin",
            password: args.initialAccount?.password ?? "password",
          },
          logLevel: "INFO",
          limits: {
            authRatelimit: {
              ip: "100/minute;3600/hour",
            },
            messageSizeLimitInMegabytes: 200,
          },
          persistence: {
            size: "10Gi",
            storageClass: "rancher.io/local-path",
          },
          secretKey: "chang3m3!",
        },
        version: "1.2.0",
      },
      { dependsOn: mailuNamespace, provider: args.provider, parent: this },
    );

    this.registerOutputs();
  }
}
