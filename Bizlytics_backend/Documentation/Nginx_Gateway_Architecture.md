# Nginx Gateway Architecture 

## Role of Nginx as the Single Gateway
In the Bizlytics SaaS architecture, Nginx acts as the **Reverse Proxy** and the single point of entry for all external traffic. This ensures that internal services like the FastAPI backend and Flower dashboard are kept secure and isolated within the private Docker network.

---

##  1. Infrastructure Setup (`docker-compose.yml`)
Nginx is the only service that exposes public ports. All other services are accessed internally.

```yaml
  # Nginx Gateway (The Front Door)
  nginx:
    image: nginx:alpine
    container_name: bizlytics_nginx
    ports:
      - "80:80"                      
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro  # Mounts the custom configuration
    depends_on:
      - backend
      - flower
```

---

##  2. Core Routing Logic (`nginx.conf`)
The configuration uses `proxy_pass` to route traffic based on the URI path.

- **Root (`/`):** All traffic is proxied to the FastAPI server at `http://backend:8000`.
- **Flower (`/flower/`):** Monitoring traffic is proxied to the Celery Flower dashboard at `http://flower:5555/`.

### Header Forwarding (Multi-Tenancy)
For the multi-tenant architecture to work, Nginx is configured to forward the standard headers along with the custom application headers:

| Header | Purpose |
| :--- | :--- |
| **`Host`** | Forwards the original host name (essential for subdomain tracking). |
| **`X-Real-IP`** | Forwards the actual client's IP address. |
| **`X-Tenant-ID`** | **The Multi-Tenant ID.** This is extracted from the user's request and passed to the FastAPI middleware. |

```nginx
proxy_set_header X-Tenant-ID $http_x_tenant_id;
```

---

##  3. Security Benefits
1. **Single Entry Point:** Only port 80 is open to the public; port 8000 and 5555 are private.
2. **Protection:** Direct attacks on the application server (Uvicorn) are blocked by Nginx.
3. **Future (Subdomain Switching):** The current configuration is "Subdomain Ready." By replacing `X-Tenant-ID` with a URL-parsing rule in Nginx, we can automatically switch tenants based on the URL (e.g., `company_a.bizlytics.ai`).

---

##  4. How to Verify
Access the system via:
- **API:** `http://localhost/`
- **Flower:** `http://localhost/flower/`

Note: Ensure the `nginx.conf` file is present in the same directory as `docker-compose.yml`.
