# API de NEXUS y práctica con Postman

La API implementa los diez dominios OWASP API Security Top 10:2023. Para comparar el caso de laboratorio y una alternativa defensiva, cada reto tiene una ruta en `/api/v1/` y otra protegida en `/api/secure/v1/`.

## Importante sobre este laboratorio

- Solo usa datos ficticios y en memoria. Al reiniciar el contenedor, el estado vuelve a las fixtures iniciales.
- Checkout, pagos, inventario, envío y proveedores son simulaciones; no procesan pagos ni llaman servicios externos.
- El reto API7 simula respuestas de metadata/red interna. **No hace conexiones de red**; no permite convertir la instancia EC2 en proxy.
- El prefijo vulnerable existe para aprender. No añadas información real ni credenciales reales. Mantén limitada la entrada de red a la clase y detén el laboratorio al terminar.

## Arquitectura

```text
Navegador / Postman
        │ HTTP :80
        ▼
Nginx (archivos estáticos + reverse proxy /api/*)
        │ red Docker privada
        ▼
Express API :3000 (no publicado en el host)
        ├── /api/v1/*         ejemplos deliberadamente vulnerables/simulados
        └── /api/secure/v1/*  alternativa con controles de servidor
```

La aplicación web sigue funcionando como laboratorio interactivo; ahora puedes copiar los endpoints que muestra a Postman. El frontend y la API salen por el mismo host. Docker no publica el puerto 3000 de Express directamente.

## Endpoints

| Dominio | Ejemplo de laboratorio | Alternativa defensiva | Qué observar |
|---|---|---|---|
| API1 BOLA | `GET /api/v1/invoices/1042` | `GET /api/secure/v1/invoices/1042` | Carlos autenticado obtiene la factura de María en la ruta demo; la ruta segura limita por principal y tenant. |
| API2 Auth | `POST /api/v1/auth/login`, `/refresh`, `GET /auth/profile` | Mismas rutas bajo `/api/secure/v1/auth/` | Token demo con secreto predecible, claims decodificados sin verificar y refresh reutilizable; comparación segura valida firma, audiencia, emisor y rota refresh de un solo uso. |
| API3 BOPLA | `PATCH /api/v1/profile` | `PATCH /api/secure/v1/profile` | La demo hace mass assignment; la alternativa solo permite `displayName` y `phone`. |
| API4 Consumo | `GET /api/v1/orders?limit=999999` | `GET /api/secure/v1/orders?limit=999999` | Fixture acotada; la alternativa valida el límite, lo restringe y aplica propiedad del usuario. |
| API5 Función | `DELETE /api/v1/admin/users/maria` | `DELETE /api/secure/v1/admin/users/carlos` | Demo sin control de rol; segura exige JWT de admin y scope del tenant. Solo cambia fixtures en memoria. |
| API6 Flujo | `POST /api/v1/checkout` | `POST /api/secure/v1/checkout` | Demo acepta repeticiones; segura limita unidades e implementa idempotencia. No hay pago real. |
| API7 SSRF | `POST /api/v1/previews` con URL de metadata simulada | `POST /api/secure/v1/previews` | El servidor devuelve JSON ficticio para enseñar el impacto; no envía una petición HTTP. La ruta segura permite solo `https://preview.nexus.example`. |
| API8 Configuración | `GET /api/v1/health` | `GET /api/secure/v1/health` | La demo muestra datos falsos y refleja Origin con credenciales; la segura devuelve un estado mínimo. |
| API9 Inventario | `GET /api/v1/legacy/reports` | `GET /api/secure/v1/legacy/reports` | Ruta demo legacy activa; la alternativa responde `410 Gone`. |
| API10 Consumo externo | `POST /api/v1/shipping/quote` | `POST /api/secure/v1/shipping/quote` | La demo confía en campos enviados; la alternativa valida servicio y calcula el precio desde política local. No llama al proveedor. |

Los endpoints adicionales `GET /api`, `GET /api/docs`, `GET /api/healthz`, `GET /api/v1/meta/inventory` y `POST /api/v1/lab/reset` ayudan a descubrir y reiniciar la simulación. `POST /api/v1/lab/reset` restaura los usuarios, facturas y eventos en memoria.

## Probar en Postman

1. Importa `postman/NEXUS-OWASP-API-Lab.postman_collection.json` y `postman/NEXUS-Local.postman_environment.json`.
2. Selecciona el environment **NEXUS — Local**. `baseUrl` vale `http://localhost` para Docker local. Para EC2 cámbialo a `http://IP_PUBLICA_EC2`.
3. Ejecuta `00 — Reiniciar fixtures`.
4. En **API1**, ejecuta primero **Login Carlos**; un script guarda `demoToken`. Ejecuta luego **BOLA: leer factura 1042** y compara con la ruta segura.
5. En **API2**, observa **Token inventado sin firma (vulnerable)** y las rutas de login/refresh seguras. Para token inventado se usa un JWT de formato `alg=none`; el endpoint vulnerable solo decodifica claims.
6. Ejecuta cada carpeta API3–API10 y compara los status/body de las alternativas. Las solicitudes incluyen cuerpos sintéticos.
7. En API5, ejecuta primero la eliminación vulnerable; elimina solo a `maria` de la fixture en memoria. Luego ejecuta la segura con `adminToken`. Usa el reset para restaurar el estado.

### Usuarios de demostración (ficticios)

| Usuario | Password | Rol | Tenant |
|---|---|---|---|
| `carlos` | `demo123` | user | `t-acme` |
| `maria` | `demo123` | user | `t-beta` |
| `admin` | `admin123` | admin | `t-acme` |

## Levantar localmente

En macOS instala/abre Docker Desktop, luego desde la raíz del repositorio:

```bash
openssl rand -hex 48
```

Copia la salida y guárdala como `LAB_SECRET` en un archivo `.env` local (no lo subas a Git). Después:

```bash
docker compose up --build -d
docker compose ps
curl http://localhost/api/healthz
```

Abre `http://localhost/` para el frontend y selecciona `NEXUS — Local` en Postman. La API no está publicada como puerto host; Nginx enruta `/api/` a través de la red privada de Compose.

Para parar la demo:

```bash
docker compose down
```

Para ver logs:

```bash
docker compose logs -f web api
```

## Publicar en EC2

El paso a paso de AWS, Docker y el grupo de seguridad está en la sección **Despliegue en AWS EC2** de `README.md`.
