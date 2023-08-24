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

    // TODO: debug cmd error 126 in pipeline
    // const k3seCmd = new command.local.Command(
    //   "k3seCmd",
    //   {
    //     create: "k3se up ./k3se/stage.yml -k /dev/null",
    //     update: "k3se up ./k3se/stage.yml -k /dev/null",
    //     delete: "k3se down ./k3se/stage.yml",
    //   },
    //   { parent: this },
    // );

    const getKubeconfigCmd = new command.local.Command(
      "getKubeconfigCmd",
      {
        create:
          "k3se up -s -k /tmp/k3se-kubeconfig ./k3se/stage.yml &> /dev/null && cat /tmp/k3se-kubeconfig",
      },
      { parent: this },
    );

    const provider = new k8s.Provider(
      "k8sProvider",
      {
        kubeconfig: getKubeconfigCmd.stdout,
      },
      { parent: this, dependsOn: getKubeconfigCmd },
    );
    this.provider = provider;
  }
}
