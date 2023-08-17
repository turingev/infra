import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

const renderPlaybookCmd = new command.local.Command("renderPlaybookCmd", {
  create:
    "cd ./k3s-ansible && ansible-playbook site.yml -i inventory/turingev/hosts.ini",
});

const ansibleInventoryCmd = new command.local.Command("ansibleInventoryCmd", {
  create:
    "ansible-inventory -i ./k3s-ansible/inventory/turingev/hosts.ini --list",
});

export const ansibleInventory = ansibleInventoryCmd.stdout.apply((v) => inv);

const getKubeconfigCmd = new command.remote.Command(
  "getKubeconfigCmd",
  {
    create: "cat /root/.kube/config",
    connection: {
      host: ansibleInventory.apply((v) => v.master.hosts[0]),
      port: 22,
      user: "root",
    },
  },
  { dependsOn: [renderPlaybookCmd] },
);

export const provider = new k8s.Provider("doK8sProvider", {
  kubeconfig: getKubeconfigCmd.stdout,
});
