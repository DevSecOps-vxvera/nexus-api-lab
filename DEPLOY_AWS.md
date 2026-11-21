# Publicar NEXUS API Lab en AWS EC2 con Docker

Esta guía publica el frontend y la API educativa mediante Docker Compose. `/api/v1/*` demuestra fallos deliberados; toda la API usa datos ficticios en memoria. SSRF y llamadas de pago/proveedor están simuladas y no abren conexiones salientes. No cargues datos ni credenciales reales.

## 1. Sube el proyecto a GitHub

Desde Terminal en tu Mac, en la raíz del repositorio:

```bash
git add Dockerfile docker-compose.yml .dockerignore .gitignore .env.example nginx api postman API_GUIDE.md DEPLOY_AWS.md README.md index.html styles.css app.js api-lab-github-pages-v2.zip
git commit -m "Agregar API Docker y colección Postman para el laboratorio"
git push
```

## 2. Crea una instancia EC2

En AWS Console, abre **EC2 → Launch instance**:

1. Elige Ubuntu Server 24.04 LTS. Docker admite arquitecturas amd64 y arm64.
2. Crea o selecciona un key pair y guarda el `.pem` de forma segura.
3. Configura el Security Group:
   - SSH TCP 22, Source **My IP**.
   - HTTP TCP 80, Source la IP/VPN/red del grupo del curso cuando sea posible.
   - No abras el puerto 3000: Express no se publica en el host, Nginx es el único servicio expuesto.
4. Lanza la instancia y copia su **Public IPv4 address**.

AWS recomienda restringir SSH a direcciones IP de confianza, no `0.0.0.0/0` ([grupos de seguridad EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html)). Si el curso necesita abrir HTTP a todo Internet, todas las rutas vulnerables serán accesibles mientras el puerto 80 permanezca abierto. Limita ese periodo, usa una instancia dedicada y ciérralo al terminar.

## 3. Conéctate desde macOS

Reemplaza la ruta de la llave y la IP pública:

```bash
chmod 400 ~/Downloads/nexus-lab.pem
ssh -i ~/Downloads/nexus-lab.pem ubuntu@IP_PUBLICA_EC2
```

## 4. Instala Docker Engine y Compose

En Ubuntu, ejecuta el método del repositorio APT oficial de Docker ([instrucciones vigentes](https://docs.docker.com/engine/install/ubuntu/)):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<DOCKERREPO
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
DOCKERREPO
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
```

Estas instrucciones instalan Docker Engine y el plugin Compose desde el repositorio oficial, no la variante independiente de Compose ([Docker Compose en Linux](https://docs.docker.com/compose/install/linux/)).

## 5. Descarga el código y crea el secreto local

Clona el repositorio. Si es privado, configura acceso antes de ejecutar `git clone`; no pegues credenciales de GitHub en comandos o archivos versionados.

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
openssl rand -hex 48
```

Copia el valor generado. Crea el `.env` **solo en EC2**; reemplaza `SECRETO_GENERADO` por ese valor:

```bash
sudo sh -c 'umask 077; printf "LAB_SECRET=%s\n" "SECRETO_GENERADO" > .env'
sudo docker compose up --build -d
sudo docker compose ps
curl http://localhost/api/healthz
```

El `.env` está excluido de Git. El contenedor API exige `LAB_MODE=true` y el Compose lo establece explícitamente porque este backend es un laboratorio con rutas deliberadamente vulnerables.

## 6. Abre el sitio y configura Postman

En un navegador, abre:

```text
http://IP_PUBLICA_EC2/
```

En Postman importa los archivos:

- `postman/NEXUS-OWASP-API-Lab.postman_collection.json`
- `postman/NEXUS-Local.postman_environment.json`

Selecciona **NEXUS — Local** y cambia `baseUrl` a `http://IP_PUBLICA_EC2`. La guía `API_GUIDE.md` explica cada reto, las credenciales sintéticas y qué comparar entre `/api/v1/` y `/api/secure/v1/`. También puedes abrir `/api/docs` desde navegador para ver el mapa de rutas.

Usa únicamente `demo123` y `admin123` para los usuarios ficticios. El sitio de ejemplo usa HTTP para hacer la publicación de aula simple; no transmitas contraseñas reales ni datos sensibles por HTTP. Para acceso estable fuera de una red de clase, configura un dominio con HTTPS y un reverse proxy TLS antes de enseñar autenticación. HTTPS requiere tener un dominio apuntando a la instancia y abrir TCP 443.

## 7. Actualiza, revisa y apaga

Para actualizar después de subir cambios:

```bash
git pull
sudo docker compose up --build -d
```

Logs:

```bash
sudo docker compose logs -f web api
```

Detén los contenedores:

```bash
sudo docker compose down
```

Al terminar el curso, cierra HTTP en el Security Group y detén o termina la instancia. EC2 y almacenamiento EBS pueden seguir generando cargos según el estado/configuración; consulta los costos de tu cuenta antes de lanzar.

## Referencias oficiales

- [Docker Engine en Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Instalar Docker Compose plugin en Linux](https://docs.docker.com/compose/install/linux/)
- [Crear un Security Group de EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html)
- [Lanzar instancia EC2 de prueba](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/tutorial-launch-a-test-ec2-instance.html)
