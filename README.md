# API//LAB — OWASP API Security Top 10:2023 + ASVS

Laboratorio educativo estático en español, preparado para publicar en GitHub Pages. Presenta un sistema financiero ficticio llamado **NEXUS** y diez retos interactivos: escenario, flujo, endpoint, código vulnerable, evaluación de controles y tres alternativas de remediación con retroalimentación.

> El código es ilustrativo y el laboratorio no ejecuta peticiones contra servicios. NEXUS, sus dominios y datos son ficticios. Las opciones enseñan protección insuficiente, parcial y recomendada para comparar defensas; deben revisarse y adaptarse antes de usarlas en un producto real.

## Contenido

- `index.html` — arquitectura, tarjetas de retos, referencias y acceso al ZIP.
- `styles.css` — diseño responsive futurista.
- `app.js` — escenarios, actividades, feedback, progreso y puntos.
- `api-lab-github-pages-v2.zip` — paquete comprimido de esta versión, listo para descargar/transferir.

No requiere backend, build, dependencias ni claves. El progreso se guarda en `localStorage` del navegador utilizado.

## Cambios de la versión 2

Al seleccionar una alternativa, se abre una vista a pantalla completa con pestañas para **Código** y **Recomendación y referencias**. Desde esa vista se puede cambiar entre A/B/C sin volver al reto. Cada explicación incluye un enlace al riesgo correspondiente de OWASP API Top 10:2023 y requisitos/ capítulos pertinentes de ASVS v5.0.0.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y copia `index.html`, `styles.css`, `app.js` y este README a la raíz del repositorio (o sube el ZIP y extrae su contenido).
2. Abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona la rama `main` y la carpeta `/ (root)`, luego pulsa **Save**.
5. Espera a que Pages indique la URL del sitio. Cada actualización de esos archivos se publica desde la rama seleccionada.

Los enlaces internos son relativos, por lo que funcionan bajo una URL de proyecto (`usuario.github.io/repositorio/`). La fuente tipográfica Manrope/DM Mono se carga desde Google Fonts; si no hay conexión, se usan tipografías genéricas locales.

El backend Docker con los 10 dominios de API, la colección de Postman y la guía de publicación en EC2 están en [API_GUIDE.md](API_GUIDE.md) y [DEPLOY_AWS.md](DEPLOY_AWS.md). El paquete completo con estos archivos también está adjunto en esta conversación.

## Referencias oficiales verificadas

- [OWASP API Security Top 10:2023 — lista oficial de riesgos](https://api-security.owasp.org/editions/2023/en/0x11-t10/)
- [OWASP API Security Top 10:2023 — API Security Risks](https://api-security.owasp.org/editions/2023/en/0x10-api-security-risks/)
- [OWASP ASVS — portal oficial](https://asvs.owasp.org/)
- [OWASP ASVS 5.0.0 — descarga y rama de versión](https://asvs.owasp.org/downloads/)
- [OWASP ASVS — fuente oficial fijada a v5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0)

Al verificar el material, el portal ASVS indicó **5.0.0 como versión estable**. Los mapeos de cada reto señalan capítulos temáticos del ASVS (por ejemplo, V4 API and Web Service, V6 Authentication, V8 Authorization, V9 Self-contained Tokens, V10 OAuth/OIDC y V13 Configuration). Son pistas de estudio, no afirmaciones de equivalencia normativa 1:1. Consulta el texto del requisito aplicable y su nivel directamente en la versión oficial antes de usarlo en una evaluación formal.

## Privacidad y límites

El progreso y los puntos permanecen localmente en el navegador. No se transmiten respuestas. La única conexión externa opcional es la descarga de tipografías web y los enlaces que el usuario abra hacia OWASP.
