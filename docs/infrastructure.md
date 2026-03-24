# Infrastructure

How to deploy the API server with free DNS, free SSL, reverse proxy, process management, and webhook-based sync.

## Overview

```
Internet
    │
    ▼
┌────────────────────────────┐
│  Nginx (reverse proxy)     │
│  - SSL termination         │
│  - Rate limiting           │
│  - Security headers        │
│  Port 443 (HTTPS)          │
└────────────┬───────────────┘
             │ proxy_pass
             ▼
┌────────────────────────────┐
│  Uvicorn (ASGI server)     │
│  - Runs the FastAPI app    │
│  Port 8100 (localhost)     │
│  Managed by systemd        │
└────────────────────────────┘
             │ reads files
             ▼
┌────────────────────────────┐
│  Obsidian Vault (on disk)  │
│  - Updated via git pull    │
│  - Triggered by webhook    │
└────────────────────────────┘
```

## Free Domain: DuckDNS

[DuckDNS](https://www.duckdns.org) provides free subdomains that point to your server's IP. The domain never expires and is updated automatically if your IP changes.

### Setup

1. Create account at duckdns.org (login with GitHub/Google)
2. Register a subdomain → you get `your-name.duckdns.org`
3. Create an update script:

```bash
# ~/duckdns/duck.sh
echo url="https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

4. Schedule it every 5 minutes:

```bash
# crontab -e
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

The `&ip=` parameter is empty on purpose — DuckDNS auto-detects your server's public IP.

## Free SSL: Let's Encrypt

SSL certificates from [Let's Encrypt](https://letsencrypt.org) are free and auto-renewing. For DuckDNS domains, use the DNS-01 challenge via the `certbot-dns-duckdns` plugin.

### Why DNS-01 instead of HTTP-01?

- **HTTP-01** requires port 80 to be free during certificate issuance
- **DNS-01** validates via a TXT record — no port needed, works even if Nginx is already running

### Setup

```bash
# Install the plugin
sudo pip3 install certbot-dns-duckdns

# Create credentials file
sudo mkdir -p /etc/letsencrypt/duckdns
echo "dns_duckdns_token=YOUR_TOKEN" | sudo tee /etc/letsencrypt/duckdns/credentials.ini
sudo chmod 600 /etc/letsencrypt/duckdns/credentials.ini

# Issue certificate
sudo certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
  --dns-duckdns-propagation-seconds 120 \
  -d "your-name.duckdns.org"
```

Certificates auto-renew via certbot's systemd timer. Add a post-renewal hook to reload Nginx:

```bash
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/bash
systemctl reload nginx
```

## Reverse Proxy: Nginx

Nginx sits in front of the API, handling SSL, rate limiting, and security headers.

### Key Configuration

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=amazfit_api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=amazfit_webhook:10m rate=5r/m;

server {
    listen 443 ssl;
    server_name your-name.duckdns.org;

    # SSL
    ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Block common scanners
    location ~* \.(env|git|php)$ {
        deny all;
        return 404;
    }

    # Webhook (stricter rate limit)
    location /api/v1/webhook/ {
        limit_req zone=amazfit_webhook burst=3 nodelay;
        proxy_pass http://127.0.0.1:8100;
    }

    # API (standard rate limit)
    location / {
        limit_req zone=amazfit_api burst=10 nodelay;
        proxy_pass http://127.0.0.1:8100;
    }
}
```

### Rate Limiting Explained

- **API**: 30 requests/minute per IP, burst of 10. A watch refreshing every few minutes is fine. An attacker brute-forcing the API key gets rate-limited quickly.
- **Webhook**: 5 requests/minute per IP, burst of 3. GitHub sends at most one push event per push. The tight limit prevents webhook abuse.
- **503 on limit**: Nginx returns `503 Service Temporarily Unavailable` when the limit is hit.

## Process Manager: systemd

The API runs as a systemd service that starts on boot and restarts on failure.

### Service File

```ini
# /etc/systemd/system/amazfit-notes-api.service
[Unit]
Description=Amazfit Notes API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/amazfit-notes-api
ExecStart=/opt/amazfit-notes-api/.venv/bin/uvicorn src.main:app --host 127.0.0.1 --port 8100
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Key Points

- **`127.0.0.1`**: Binds only to localhost. The API is not directly accessible from the internet — all traffic goes through Nginx.
- **`Restart=always`**: If the process crashes, systemd restarts it after 5 seconds.
- **`After=network.target`**: Waits for networking before starting.

### Commands

```bash
sudo systemctl start amazfit-notes-api    # Start
sudo systemctl stop amazfit-notes-api     # Stop
sudo systemctl restart amazfit-notes-api  # Restart
sudo systemctl status amazfit-notes-api   # Check status
sudo journalctl -u amazfit-notes-api -f   # Follow logs
```

## Vault Sync: GitHub Webhook

The Obsidian vault is a Git repository. When you push changes, GitHub notifies the server to pull.

### How It Works

1. You configure a webhook in GitHub (repo Settings → Webhooks)
2. On every `push` event, GitHub sends a POST with a HMAC-SHA256 signature
3. The API verifies the signature and runs `git pull --ff-only`
4. The vault on disk is now up-to-date

### Webhook Security

The signature prevents anyone from triggering a fake pull:

```python
expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
received = signature_header.removeprefix("sha256=")
if not hmac.compare_digest(expected, received):
    raise HTTPException(status_code=401)
```

`--ff-only` ensures the pull only succeeds for fast-forward merges. If there's a conflict (unlikely in a single-user vault), the pull fails safely and logs the error.

### Why Not a Cron Job?

A cron job polling every 5 minutes:
- Adds up to 5 minutes of delay
- Makes ~288 unnecessary git pull calls per day
- Doesn't scale (more frequent = more waste, less frequent = more delay)

A webhook:
- Triggers instantly on push
- Zero wasted calls
- Zero delay

## Deployment Layout

```
/opt/amazfit-notes-api/          Production code
    ├── .venv/                   Python virtual environment
    ├── .env                     Production secrets
    └── src/                     Application code

~/projects/amazfit-notes/        Development workspace
    ├── api/                     API source (editable)
    └── watch/                   Watch app source
```

Production runs from `/opt/`, development happens in `~/projects/`. This separation prevents a broken development branch from crashing production.
