import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type JitsiOptions = {
  provider: k8s.Provider;
  issuer: k8s.apiextensions.CustomResource;
  host: string;
  namespace: string;
  publicIP: pulumi.Input<string>;
};

const pulumiComponentNamespace: string = "turingev:Jitsi";

export class Jitsi extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly JVBIngress: k8s.apiextensions.CustomResource;

  constructor(
    name: string,
    args: JitsiOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        chart: "jitsi-meet",
        namespace: args.namespace,
        repositoryOpts: {
          repo: "https://jitsi-contrib.github.io/jitsi-helm/",
        },
        values: {
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
          jvb: {
            publicIPs: [args.publicIP],
            service: {
              enabled: true,
              annotations: {
                "cert-manager.io/cluster-issuer": args.issuer.metadata.name,
              },
            },
          },
        },
        version: "1.3.7",
      },
      { dependsOn: this.namespace, provider: args.provider, parent: this },
    );

    // this.JVBIngress = new k8s.apiextensions.CustomResource(
    //   name,
    //   {
    //     apiVersion: "traefik.io/v1alpha1",
    //     kind: "IngressRouteUDP",
    //     metadata: { name },
    //     spec: {
    //       entryPoints: [""],
    //       routes: [
    //         {
    //           services: [
    //             {
    //               name: "jitsi-meet",
    //               port: 30000,
    //               weight: 10,
    //               nativeLB: true,
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   },
    //   { dependsOn: args.provider, provider: args.provider, parent: this },
    // );
  }
}
