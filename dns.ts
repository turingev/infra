import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";

export type DNSZoneOptions = {
  baseDomain: string;
  rootDomain: string;
  netDomainPrefix: string;
  pulicIP: string;
};

const pulumiComponentNamespace: string = "turingev:K8sCluster";

export class DNSZone extends pulumi.ComponentResource {
  constructor(
    name,
    args: DNSZoneOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    new digitalocean.DnsRecord(`${args.baseDomain}`, {
      name: `${args.baseDomain}.`,
      domain: args.rootDomain,
      type: "A",
      value: args.pulicIP,
    });
    new digitalocean.DnsRecord(`*.${args.baseDomain}`, {
      name: `*.${args.baseDomain}.`,
      domain: args.rootDomain,
      type: "A",
      value: args.pulicIP,
    });
  }
}
