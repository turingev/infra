import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import { promises, readFileSync } from "fs";
const { readFile } = promises;

export type K8sClusterOptions = {};

const pulumiComponentNamespace: string = "turingev:K8sCluster";

export class K8sCluster extends pulumi.ComponentResource {
  provider: k8s.Provider;

  constructor(
    name,
    args: K8sClusterOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    const k3seCmd = new command.local.Command(
      "k3seCmd",
      {
        create: "./k3se-linux-amd64 up ./k3se/stage.yml -k ./kubeconfig",
        delete: "./k3se-linux-amd64 down ./k3se/stage.yml",
      },
      { parent: this },
    );

    const provider = new k8s.Provider(
      "k8sProvider",
      {
        kubeconfig: readFileSync("./kubeconfig").toString(),
      },
      { parent: this, dependsOn: k3seCmd },
    );
    this.provider = provider;
  }
}
