import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { provider } from ".";

export type LetsEncryptOptions = {
  provider: k8s.Provider;
  email?: string;
  solvers?: Array<any>;
};

const pulumiComponentNamespace: string = "turingev:CertManager";

export class LetsEncrypt extends pulumi.ComponentResource {
  public readonly issuer: k8s.apiextensions.CustomResource;
  constructor(
    name: string,
    args: LetsEncryptOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);
    this.issuer = newLetsEncrypt(name, args);
  }
}

export function newLetsEncrypt(
  name: string,
  args: LetsEncryptOptions,
): k8s.apiextensions.CustomResource {
  return new k8s.apiextensions.CustomResource(
    name,
    {
      apiVersion: "cert-manager.io/v1",
      kind: "ClusterIssuer",
      metadata: { name },
      spec: {
        acme: {
          server: "https://acme-v02.api.letsencrypt.org/directory",
          email: args.email,
          privateKeySecretRef: {
            name: "letsencrypt-account-key",
          },
          solvers: args.solvers ?? [
            {
              selector: {},
              http01: {
                ingress: {
                  class: "traefik",
                },
              },
            },
          ],
        },
      },
    },
    { dependsOn: args.provider, provider: provider },
  );
}
