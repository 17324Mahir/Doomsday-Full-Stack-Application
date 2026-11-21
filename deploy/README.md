# Host Doomsday Ready on Oracle Cloud

One Always Free Ubuntu VM runs the React app, NestJS API and PostgreSQL database. Caddy serves public HTTPS. Visitors can browse the library, generate rewatch plans and get booking quotes. A shared editor account controls changes to movies, watched status and cinemas.

## Create the VM

1. In your OCI home region, create an **Always Free–eligible** Ubuntu 24.04 LTS instance using `VM.Standard.A1.Flex`. Select 2 OCPUs, 6 GB of RAM and a 50 GB boot volume if these fit your remaining quota. Keep the public SSH key on the instance and its private key on your own computer.
2. Use a public subnet with an internet gateway, a default route to it and a public IP. Set DNS for a hostname you control to that IP. An existing subdomain or a free dynamic-DNS hostname works. If you publish an AAAA record, it must also reach the server.
3. In the OCI security list or network security group, allow inbound TCP ports 80 and 443 from visitors. Restrict inbound TCP port 22 to your administrator IP. Apply the same access at the VM firewall. Leave PostgreSQL and the internal API and web ports closed to the internet.
4. Connect over SSH as `ubuntu`. Install Git and Docker Engine with its Compose plugin using Docker's Ubuntu instructions. Use Compose 2.24.4 or newer for this deployment. In the commands below, `sudo docker` uses the system Docker daemon. [OCI networking](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm) · [Docker installation](https://docs.docker.com/engine/install/ubuntu/) · [Compose overrides](https://docs.docker.com/reference/compose-file/merge/)

Oracle documents 2 OCPUs and 12 GB of A1 memory across the tenancy and 200 GB of combined boot and block storage under Always Free. Check the eligible label and your remaining capacity when provisioning. Home-region capacity can run out, and Oracle may reclaim idle instances. Signup typically requires a card for identity verification. [Oracle Always Free limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) · [Free Tier FAQ](https://www.oracle.com/cloud/free/faq/)

## Configure the editor

Clone your repository into `doomsday-ready` on the VM and open that directory. Generate the editor's bcrypt hash. Caddy prompts for the password with input hidden. Save the original password in a password manager.

```sh
sudo docker run --rm -it caddy:2-alpine caddy hash-password
umask 077
touch .env
chmod 600 .env
nano .env
```

Add these entries to the project's root `.env`. Use the DNS hostname by itself and replace the example text with your generated hash. The single quotes preserve the hash's dollar signs during Compose interpolation.

```dotenv
SITE_HOSTNAME=planner.example.org
EDITOR_USERNAME=editor
CADDY_PASSWORD_HASH='paste-the-complete-bcrypt-hash-here'
```

The root `.env` is private to this host. Compose generates the database credentials separately when it starts a fresh database.

## Start and check the site

Run the following commands from the repository root. Keep both Compose files in the command when operating this hosted installation.

```sh
sudo docker compose -f compose.yaml -f compose.host.yaml config --quiet
sudo docker compose -f compose.yaml -f compose.host.yaml up -d --build --wait
sudo docker compose -f compose.yaml -f compose.host.yaml ps
```

Open `https://YOUR_HOSTNAME/` to browse. Open `https://YOUR_HOSTNAME/editor` to sign in through the browser prompt. The browser returns to the library and uses the credentials for subsequent edits on that origin. For a shared computer, use a private browsing window and close it when finished. API clients can use HTTP Basic authentication over HTTPS for POST and PATCH requests with a JSON body. To rotate the password, generate a new hash, edit the root `.env`, and rerun the hosted `up` command.

Caddy obtains and renews its certificate when the hostname resolves and ports 80 and 443 are reachable. Its certificate data and PostgreSQL data live in named volumes that survive container replacement. If certificate issuance fails, check DNS, the VM and OCI firewall rules, and `sudo docker compose -f compose.yaml -f compose.host.yaml logs gateway`. [Caddy HTTPS requirements](https://caddyserver.com/docs/automatic-https)

## Back up the catalog

Save a dump outside the repository before updates and regularly while the site is in use. Run this from the repository root.

```sh
umask 077
mkdir -p "$HOME/doomsday-backups"
backup="$HOME/doomsday-backups/catalog-$(date -u +%Y%m%dT%H%M%SZ).dump"
sudo docker compose -f compose.yaml -f compose.host.yaml exec -T db \
  sh -ec 'exec pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$backup" &&
sudo docker compose -f compose.yaml -f compose.host.yaml exec -T db \
  pg_restore --list < "$backup" > /dev/null
```

Keep an encrypted copy off the VM. Rehearse recovery by restoring into a separate, empty PostgreSQL database with `pg_restore --exit-on-error --no-owner --no-acl`, then check that movies, watched flags, prerequisites and cinemas load there. When restoring a deployment, rerun the setup service to apply the database permissions. Keep backups, the editor configuration, and SSH keys outside Git.

To update a deployment, back up, pull your reviewed revision, then rerun the hosted `up` command. Migrations run during startup. To stop the deployment while preserving its data, use `sudo docker compose -f compose.yaml -f compose.host.yaml down`.
