import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { config } from "./";

export type SecretsOptions = {
  provider: k8s.Provider;
};

const pulumiComponentNamespace: string = "turingev:Dashboard";

export class Secrets extends pulumi.ComponentResource {
  public readonly digitaloceanCredentials: k8s.core.v1.Secret;

  constructor(
    name: string,
    args: SecretsOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.digitaloceanCredentials = new k8s.core.v1.Secret(
      "lets-encrypt-do-dns",
      {
        metadata: {
          name: "lets-encrypt-do-dns",
          namespace: "cert-manager",
        },
        type: "Opaque",
        stringData: {
          "access-token": config.requireSecret("do-access-token"),
        },
      },
      { provider: args.provider },
    );
  }
}
