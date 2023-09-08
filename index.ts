import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

export const config = new pulumi.Config();

import { K8sCluster } from "./cluster";
import { Mailu } from "./mailu";
import { CertManager } from "./certManager";
import { LetsEncrypt } from "./letsencrypt";
import { Deployset } from "./deployset";
import { Secrets } from "./secrets";
import { DNSZone } from "./dns";
import { Dasboard } from "./dashboard";
import { Longhorn } from "./longhorn";

export const dns = new DNSZone("turingev-dns", {
  rootDomain: config.require("root-domain"),
  baseDomain: config.require("base-domain"),
  netDomainPrefix: config.require("net-domain-prefix"),
  pulicIP:config.require("public-ip"),
});

export const k8sCluster = new K8sCluster("turingev-cluster", {}, {});
export const provider = k8sCluster.provider;

const secrets = new Secrets("turingev-secrets", { provider }, {});

const certManager = new CertManager(
  "turingev-certmanager",
  { namespaceName: "cert-manager", helmChartVersion: "1.12.3", provider },
  { provider, parent: k8sCluster },
);

const solvers = [
  {
    selector: {
      dnsZones: [config.require("base-domain")],
    },
    dns01: {
      digitalocean: {
        tokenSecretRef: {
          name: secrets.digitaloceanCredentials.metadata.name,
          key: "access-token",
        },
      },
    },
  },
  {
    selector: {},
    http01: {
      ingress: {
        class: "traefik",
      },
    },
  },
];

const letsencrypt = new LetsEncrypt(
  "letsencrypt-issuer",
  {
    email: config.require("admin-email"),
    solvers,
    provider,
  },
  { dependsOn: certManager, parent: certManager },
);

const longhorn = new Longhorn(
  "turingev-longhorn",
  {
    host: `longhorn.${config.require("base-domain")}`,
    issuer: letsencrypt.issuer,
    provider,
  },
  { parent: k8sCluster },
);

const dashboard = new Dasboard(
  "turingev-dashboard",
  {
    namespaceName: "kubernetes-dashboard",
    issuer: letsencrypt.issuer,
    host: `dashboard.${config.require("base-domain")}`,
    provider,
  },
  { parent: k8sCluster },
);

const website = new Deployset("turingev-website", {
  port: 9000,
  image: "ghcr.io/turingev/turingev-website:latest",
  host: config.require("base-domain"),
  namespace: "default",
  provider: provider,
  issuer: letsencrypt.issuer,
  env: [
    {
      name: "EMAIL_FROM",
      value: config.requireSecret("notify-email-from"),
    },
    {
      name: "EMAIL_TO",
      value: config.require("notify-email-to"),
    },
    {
      name: "EMAIL_SERVER",
      value: config.require("notify-email-server"),
    },
    {
      name: "EMAIL_PASSWORD",
      value: config.requireSecret("notify-email-password"),
    },
  ],
});

// export const mailserver = new Mailu(
//   "turingev-mailsever",
//   {
//     domain: `mail.${config.require("base-domain")}`,
//     namespaceName: "mailu",
//     provider,
//   },
//   { parent: k8sCluster },
// );
