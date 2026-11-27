# Portfolio 3D de Darshan — Especificación para Claude Code

> Documento de handoff. Describe **qué** construir y **cómo debe sentirse**. Las decisiones marcadas como **[ACEPTADA]** fueron propuestas aprobadas por Darshan (26/11/2026); las marcadas como **[PENDIENTE]** requieren contenido de Darshan (usar placeholders mientras tanto, sin bloquear el desarrollo).

## Links y contacto

| Uso | Link | Dónde aparece |
|---|---|---|
| GitHub | https://github.com/darshanperez | Escena 1 y escena 15 |
| LinkedIn | https://mx.linkedin.com/in/darshanperez | Escena 1 y escena 15 |
| Correo | `mailto:darshan.dev@tutamail.com` | Solo escena 15 |
| Codeforces | https://codeforces.com/profile/AxoltDash | Solo escena 15 |
| Modrinth | https://modrinth.com/user/darshanperez | Solo escena 15 (relacionado con el proyecto `minecraft`) |
| CV | `public/cv/darshan-perez-resume.pdf` (Darshan lo adjunta) | Solo escena 15, botón "Download résumé" con atributo `download` |

- La escena 1 muestra **solo** GitHub y LinkedIn.
- Los links viven en `src/data/links.js` (`{ id, url, icon, scenes: ['intro','about'] }`) para que agregar o mover uno sea editar datos.
- Links externos con `target="_blank" rel="noopener noreferrer"`.
- Iconos de GitHub, LinkedIn, Codeforces y Modrinth desde Simple Icons; correo con un icono genérico de sobre.

---

## Paso 0 — Preparación (antes de empezar a construir)

> **Las skills NO se instalan solas por leer este documento.** Hay que instalarlas primero. Unas se instalan con comandos `/plugin` que **Darshan escribe a mano** en Claude Code (Claude no puede ejecutar comandos con `/`); las demás son comandos de terminal que Claude Code sí puede ejecutar cuando se le pide.

### 0.1 Plugins — los escribe Darshan en Claude Code

```
/plugin marketplace add freshtechbro/claudedesignskills
/plugin install core-3d-animation@claude-design-skillstack
/plugin install frontend-design@claude-plugins-official
/reload-plugins
```

- `core-3d-animation` trae Three.js, GSAP ScrollTrigger, R3F, Motion y Babylon.
- `frontend-design` es oficial de Anthropic. Si el marketplace oficial no aparece: `/plugin marketplace add anthropics/claude-plugins-official`.

### 0.2 Skills — Claude Code puede ejecutar esto en la terminal del proyecto

```bash
# Se instalan en .claude/skills/ del proyecto
npx -y skills add 404kidwiz/claude-supercode-skills --skill threejs-pro --agent claude-code
npx -y skills add popey/claude-code-skills --skill scroll-experience --agent claude-code
npx -y skills add freshtechbro/claudedesignskills --skill blender-web-pipeline --agent claude-code   # opcional: solo si después se usan modelos .glb hechos en Blender

# awwwards-3d no está en el registro: se clona directo
git clone --depth 1 https://github.com/tsogjavklann/awwwards-3d .claude/skills/awwwards-3d
rm -rf .claude/skills/awwwards-3d/.git
```

### 0.3 Verificación

- Revisar el `SKILL.md` de cada skill de terceros antes de usarla (no están auditadas).
- Reiniciar Claude Code o ejecutar `/reload-plugins` y comprobar con `/plugin` (plugins) y `ls .claude/skills` (skills).
- Si dos skills dan instrucciones contradictorias, **manda este documento**.

### 0.4 Que Claude Code siempre lea este documento

Guardar este archivo como `docs/PORTFOLIO_SPEC.md` y crear un `CLAUDE.md` en la raíz del proyecto con:

```markdown
# Portfolio de Darshan
La especificación completa está en @docs/PORTFOLIO_SPEC.md. Síguela en cada tarea.
Trabaja por fases (§15) y haz deploy a GitHub Pages al terminar cada una.
Los tokens de diseño (§17) y de movimiento (§18) son la única fuente de valores visuales.
```

Así la especificación se carga automáticamente en cada sesión.

---

## 0. Resumen

Sitio portafolio de una sola página, publicado en **GitHub Pages**. Las escenas 1–14 son una experiencia 3D cinematográfica **controlada por scroll** (scrub). La escena 15 es una página de portafolio normal, sobria y con poco movimiento. Un botón "Skip" permite saltar directamente a la escena 15.

- Idioma principal: **inglés**. Traducciones modulares vía **CSV** (en / es), cargado en runtime.
- Misma experiencia en **escritorio y móvil** (con ajustes de rendimiento, no de contenido).
- Sección de proyectos **modular**: añadir o quitar un proyecto = editar unas líneas de datos.

## 1. Skills a usar

Cargar estas skills antes de implementar la parte correspondiente:

| Skill | Para qué |
|---|---|
| `core-3d-animation` (threejs-webgl, gsap-scrolltrigger, …) | Base técnica: Three.js + GSAP ScrollTrigger |
| `awwwards-3d` | Dirección visual, loop de render, lerp, arquitectura de escenas con scroll |
| `threejs-pro` | Shaders (luz/bloom, fades, materiales de las ventanas) |
| `frontend-design` | Tipografía, composición y estilo de la escena 15 y del texto overlay |
| Blender → glTF | Solo si se reemplazan los modelos procedurales por `.glb` (ver §6) |
| `scroll-experience` | Accesibilidad del scroll y buenas prácticas de ScrollTrigger |

## 2. Stack

- **Vite** (vanilla JS o TypeScript, sin framework; no hace falta React).
- **Three.js** (WebGLRenderer) + `EffectComposer` con `UnrealBloomPass` solo para la escena de la luz.
- **GSAP + ScrollTrigger** para la línea de tiempo maestra.
- **Lenis** para smooth scroll (sincronizado con `ScrollTrigger.update` y el ticker de GSAP).
- **PapaParse** para leer el CSV de traducciones (maneja comillas y comas dentro de textos).
- **Simple Icons** (CC0) para los logos de herramientas de la escena 14.

## 3. Arquitectura

```
/
├─ index.html
├─ vite.config.js              # base: ver §11
├─ public/
│  ├─ i18n/strings.csv         # TODOS los textos (key,en,es)
│  ├─ media/projects/          # videos/imagenes de proyectos
│  ├─ media/profile.webp       # placeholder (Darshan lo reemplaza)
│  └─ cv/darshan-perez-resume.pdf  # placeholder (Darshan lo reemplaza)
└─ src/
   ├─ main.js                  # bootstrap: i18n -> loader -> experiencia
   ├─ core/
   │  ├─ renderer.js           # renderer, camara, resize, DPR cap
   │  ├─ timeline.js           # timeline maestra + ScrollTrigger + Lenis
   │  ├─ i18n.js               # carga CSV, t(key), applyTranslations(), setLang()
   │  └─ quality.js            # detecta gama del dispositivo, ajusta calidad
   ├─ scenes/                  # una escena = un modulo con la misma interfaz
   │  ├─ 01-intro.js
   │  ├─ 02-profile.js
   │  ├─ 03-servers.js         # escenas 3, 4, 5
   │  ├─ 06-blackout.js
   │  ├─ 07-padlock.js         # escenas 7, 8
   │  ├─ 09-projects.js        # escenas 9–13
   │  └─ 14-skills.js
   ├─ models/
   │  ├─ server.js             # modelo procedural (§6)
   │  └─ padlock.js            # modelo procedural (§6)
   ├─ data/
   │  ├─ projects.js           # lista modular de proyectos (§8)
   │  └─ skills.js             # lista modular de herramientas (§9)
   └─ styles/
```

**Interfaz de escena** (todas iguales, para que la timeline las orqueste sin saber su contenido):

```js
export default {
  id: 'servers',
  scrollLength: 3,            // en viewports (100vh = 1)
  init(ctx) {},               // crea objetos, devuelve nada
  build(tl, ctx) {},          // agrega tweens a la timeline maestra en su label
  dispose(ctx) {},
};
```

`timeline.js` suma los `scrollLength` para calcular la altura del contenedor pineado y coloca cada escena en un label de la timeline. Así reordenar, quitar o alargar una escena es cambiar un número.

**Canvas único** fijo a pantalla completa detrás de una capa HTML para el texto (overlay). El texto se mantiene como HTML real (accesible, traducible, nítido); el 3D va en el canvas.

## 4. Reglas globales

- Fondo **negro** de la escena 1 a la 12; transiciona a **blanco** en la 13 y se mantiene en la 14. La escena 15 usa paleta clara (o la que defina `frontend-design`, coherente con el final blanco).
- **Todo texto tiene animación de entrada y salida** (fade + desplazamiento leve o reveal por línea; mismo estilo en todo el sitio).
- Todo está atado al scroll (scrub), excepto: el loop de la escena 14 y micro-animaciones idle (respiración leve, rotación lenta) que corren con el reloj.
- Los "FADE" del sketch = cross-fade a negro/blanco ligado al scroll, no cortes.
- Botón **"Skip the animation →"** visible desde la escena 1 y que permanece accesible (esquina fija, discreto) durante toda la experiencia: hace `lenis.scrollTo('#about')`. Si la URL trae `#about`, iniciar directamente ahí.
- Indicador sutil de "scroll" en la escena 1.

## 5. Escenas

Las longitudes de scroll son una **[ACEPTADA]** inicial; ajustarlas al probar.

### Acto 1 — Presentación (fondo negro)

**Escena 1 — Portada** · `scrollLength: 1`
- Texto: título, subtítulo, botón Skip, links LinkedIn y GitHub.
- Al hacer scroll: el texto sale con fade.

**Escena 2 — Perfil** · `scrollLength: 1.5`
- Foto de perfil como **plano 3D** (textura) que rota **lentamente** sobre su eje Y mientras se hace scroll, **siempre de frente**: nunca se ve el reverso (decisión de Darshan, 26/11/2026). Inclinación leve con el mouse (parallax), solo en escritorio.
- Texto a la derecha: rol + descripción corta.
- Sale con fade.

### Acto 2 — Servidores

> Escenas 3–5 revisadas por Darshan (26/11/2026). Sin luces de color, sin degradados y **sin cables/conexiones**: en esta etapa solo animación y 3D; los efectos visuales van en la fase 7 (§15).

**Escena 3** · `scrollLength: 1.5`
- Tres servidores 3D aparecen **desde un mismo punto central**: nacen diminutos ahí y viajan creciendo hasta su lugar. El central es más grande y va al frente; los laterales quedan **detrás** de él y **miran hacia su propio lado** (el izquierdo hacia la izquierda, el derecho hacia la derecha), no a la cámara. Si se tocan, no importa.
- Cámara en **contrapicado**: lente angular a la altura del piso, mirando hacia arriba. Los racks se ven grandes, se estrechan hacia arriba y **nunca se ve su cara inferior**; el texto queda debajo de ellos.
- Aparece el texto "Experience with".

**Escena 4** · `scrollLength: 0.8`
- **Pausa**: nada se mueve (solo los LEDs, idle) y entra "server management" para leerlo.

**Escena 5** · `scrollLength: 1.7`
- **Un solo movimiento continuo, sin pausas**: los laterales salen por los bordes y la cámara empuja hacia el cristal del servidor central y sigue hasta quedar "en tu cara" (lente más abierta), mientras todo se funde a negro.

**Escena 6** · `scrollLength: 0.5`
- Negro total (el fundido ya ocurrió durante el empuje de la escena 5).

### Acto 3 — Ciberseguridad

**Escena 7** · `scrollLength: 1.5`
- Candado 3D **abierto** aparece con zoom desde la nada.
- Texto "with a cybersecurity approach" en **rojo**.

**Escena 8** · `scrollLength: 1.5`
- El arco del candado **se cierra con un rebote** (ease tipo `back.out` / `elastic`, aunque esté atado al scroll; ver nota).
- El texto pasa de rojo a **blanco** en el momento del cierre.
- Luego la cámara hace zoom al candado y al texto (atraviesa) y fade.

> Nota: un rebote "scrubbeado" puede sentirse raro al hacer scroll lento. **[ACEPTADA]** El cierre se dispara al cruzar un umbral (`ScrollTrigger` con `onEnter`/`onLeaveBack`) y se reproduce en tiempo real; el resto de la escena sí va en scrub.

### Acto 4 — Proyectos (escenas 9–13)

Título fijo en la parte superior: **"The experience you need"**.

**Mecánica (escenas 9–11): beats** · `scrollLength` = calculado a partir de los beats (~2.3 viewports por proyecto principal)

> Revisado por Darshan (27/11/2026): cada ventana debe verse completa y quieta antes de cualquier cambio; los secundarios no pueden quedar tapados por el principal ni todos a la misma altura; el texto no desaparece antes que su ventana.

Un **beat** por proyecto principal:
1. El **principal** sale del punto de fuga (centro, lejos en Z) hacia su lado (izquierda/derecha, alternando por beat) y se asienta. Es el más grande y el único con opacidad 1.
2. Sus **2–3 secundarios** llegan **uno tras otro** (nunca a la vez) al lado opuesto, cada uno a su propio hueco, a distintas alturas y en zig-zag.
3. **Pausa**: todas las ventanas del beat están completas, quietas y legibles. Los huecos se calculan en pantalla a partir del espacio libre (junto al principal y bajo el título) y se traducen a posiciones 3D, así que en reposo nada se encima en ningún tamaño de pantalla.
4. Los secundarios salen hacia la cámara y por su borde; cuando ya van de salida, el siguiente principal crece hacia ese lado. Luego sale el principal actual y los nuevos secundarios ocupan el lado que dejó libre.

- **Etiquetas** (rol en mono, título, una línea de descripción) siempre **debajo de su ventana**: HTML real colocado en 3D con `CSS3DRenderer`, traducido desde el CSV. Entran cuando la ventana se asienta y **viajan con ella hasta que sale**. Solo durante los cruces, una etiqueta tapada por una ventana más cercana se desvanece.
- **Pasillo** (Darshan, 27/11/2026): la sección simula avanzar por un pasillo de proyectos hasta la luz del fondo. Las ventanas cuelgan de sus paredes, **giradas levemente hacia el centro** (~16°, no más) y viajan en línea recta a lo largo de ellas: del fondo a su hueco y de ahí pasando junto a la cámara.
- **Relleno** (`kind: 'filler'`): ventanas pequeñas y tenues que recorren ambas paredes **a muchas alturas** (cada proyecto de relleno pasa varias veces), sin pararse y sin etiqueta, y salen por el borde antes de llegar a la profundidad de los principales. Sí aparecen en la escena 15.
- La **luz** nace en cuanto el último principal empieza a salir, sin pausa antes.
- **Móvil (vertical)**: el principal abajo, los secundarios en una fila encima (solo título).
- Esquinas redondeadas sutiles; la media se recorta como `object-fit: cover`. Ventanas sin video (`media: null`) muestran el póster.
- Media de ejemplo ligera (MP4 de 4 s + pósters WebP, abstractos en la paleta) en `public/media/projects/`; Darshan la reemplaza con los mismos nombres.
- La luz de las escenas 11–12 es por ahora un disco blanco plano (`materials.light`), sin bloom ni halo: eso llega en la fase 7.

**Escena 11–12 — La luz** · `scrollLength: 1.5`
- Tras el último proyecto aparece una **luz blanca** en el centro (sprite/esfera emisiva + bloom), crece mientras las últimas ventanas salen.
- Crece hasta llenar la pantalla.

**Escena 13 — Blanco** · `scrollLength: 0.5`
- Pantalla completamente blanca; el fondo del sitio pasa a blanco. Fade a la siguiente.

### Acto 5 — Cierre

**Escena 14 — Skills & Tools** · `scrollLength: 2` (pineada)
- Fondo blanco. Título central "Skills & Tools".
- Dos columnas de items (logo simple + nombre corto) en **loop infinito automático**, independiente del scroll: columna izquierda baja, derecha sube (marquee vertical, duplicando la lista para que sea continua).
- Pausa al hacer hover (escritorio) **[ACEPTADA]**.
- Al seguir el scroll: fade hacia la escena 15.
- Puede ser HTML/CSS puro (no necesita el canvas).

**Escena 15 — Portafolio** (`#about`) · página normal
- Sobria, poco movimiento (solo reveals suaves).
- Contenido: nombre + "Computer Science", resumen, botón de descarga del CV, tarjetas de proyectos (principales primero, con más detalle), skills, links de contacto, selector de idioma EN/ES.
- Reutiliza `projects.js` y `skills.js` (misma fuente de datos que la parte 3D).

## 6. Modelos 3D

**[PROPUESTA] Modelarlos de forma procedural en código** (Three.js primitives), estilo estilizado/minimal:

- **Servidor**: objeto "tech" negro y minimalista, como un celular (decisión de Darshan, 26/11/2026): carcasa negra brillante con esquinas redondeadas, bisel delgado y **frente de cristal oscuro** que deja ver el hardware dentro (unidades delgadas con ranuras y LEDs pequeños que parpadean) y una banda de ventilación al pie. No caricaturesco; el realismo final llega en la fase 7.
- Los modelos piden sus materiales por rol a `src/core/materials.js` (nunca crean los suyos), para que la fase 7 mejore todo el look en un solo lugar.
- **Candado**: cuerpo (caja con bordes redondeados / `RoundedBoxGeometry`) + arco (`TorusGeometry` parcial o `TubeGeometry`) como **malla separada** con pivote para rotarlo/subirlo al abrir/cerrar + ojo de cerradura.

Ventajas: peso ~0 KB, carga instantánea (importante en GitHub Pages y móvil), totalmente animable, estilo coherente.

Diseñar los módulos `models/*.js` con la misma interfaz (`create() → { group, parts }`) para que en el futuro se pueda **reemplazar por un `.glb`** hecho en Blender sin tocar las escenas. Si se usa `.glb`: Draco/meshopt, texturas KTX2, < 1 MB por modelo; el arco del candado debe ser un objeto separado.

## 7. Traducciones (i18n)

- Archivo `public/i18n/strings.csv`, columnas: `key,en,es`. Se agregan idiomas añadiendo columnas.
- Se carga con `fetch` (respetando `import.meta.env.BASE_URL`) y se parsea con PapaParse.
- En HTML: `<h1 data-i18n="intro.title"></h1>`. Para atributos: `data-i18n-attr="aria-label:skip.aria"`.
- En JS: `t('project.sia.desc')`.
- Idioma por defecto **en**. Selección: `?lang=es` → `localStorage` → `en`. Si falta una traducción, cae a `en`.
- Los textos de proyectos y skills también viven en el CSV (los datos solo guardan keys).
- `index.html` mantiene `<title>`, meta description y Open Graph en inglés estáticos (SEO/preview de links).

## 8. Proyectos — datos modulares

`src/data/projects.js`:

```js
export const projects = [
  {
    id: 'sia',                    // keys: project.sia.title / .role / .desc / .long
    kind: 'main',                 // 'main' | 'secondary' | 'filler'
    media: 'media/projects/sia.mp4',    // video loop muted, o null (solo póster)
    poster: 'media/projects/sia.webp',
    tags: ['Full-stack'],
    links: { live: 'https://sia.ifc.unam.mx', repo: null },
  },
  { id: 'luciernagas', kind: 'secondary', beat: 'sia', /* … */ },  // beat opcional
  // ...
];
```

Agregar un proyecto = un objeto aquí + sus filas en el CSV + su media. Los secundarios sin `beat` se reparten solos entre los beats con menos ventanas.

Lista de Darshan (27/11/2026), agrupada por beat:

| Beat (principal) | Secundarios |
|---|---|
| `sia` — SIA · IFC UNAM | `luciernagas` (Django), `ifc-classes` |
| `distributed` — Distributed & Parallel Computing | `airport-db`, `ds-library` |
| `ai-model` — Custom AI Model & API | `mini-lisp`, `cc-agents` |
| `open-source` — Open Source | `minecraft` (Java modding), `cp-instructor` |

**Relleno**: `nixos`, `feria-unam`, `dotfiles`, `tongue-kde`, `java-libs`, `rust-counter`.

Ajustes para que cada beat tenga 2 secundarios: "Open source contributions" queda solo como principal; "Minecraft Java" y "minecraft modding" son un solo proyecto (secundario); `ds-library` y `cc-agents` suben de "otros" a secundarios.

**[PENDIENTE]** descripción larga (escena 15) + media real de cada proyecto; las descripciones cortas son provisionales.

**[PROPUESTA] Media:** usar **video WebM/MP4 en loop** (muted, `playsinline`) como `VideoTexture` en lugar de GIF: pesa 5–10× menos y se ve mejor. Máx. ~720 px de ancho, < 1.5 MB cada uno. Solo reproducir los videos de las ventanas visibles.

## 9. Skills — datos modulares

`src/data/skills.js`: `{ id, name, icon }` donde `icon` es un slug de Simple Icons (o SVG propio en `public/icons/`). Ejemplos: Rust, C, Python, JavaScript, Three.js, Linux, Docker, Git, PostgreSQL, Claude. **[PENDIENTE]** lista definitiva.

## 10. Rendimiento y móvil

Misma experiencia en móvil; se ajusta la calidad, no el contenido.

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; en gama baja, 1.5.
- Bloom solo durante la escena de la luz; desactivado fuera.
- Móvil: menos ventanas secundarias simultáneas en pantalla, sombras desactivadas, geometrías con menos segmentos.
- Pausar el render cuando la pestaña no está visible y cuando se está en la escena 15 (canvas oculto).
- Liberar texturas/videos de proyectos que ya salieron.
- Lenis en móvil: `syncTouch` con cuidado; probar en iOS Safari (barra de direcciones cambia el alto → usar `svh`/`lvh` y `ScrollTrigger.config({ ignoreMobileResize: true })`).
- Loader inicial mínimo mientras cargan CSV, foto y primeros videos.
- Objetivo: 60 fps en escritorio, ≥ 30 fps estables en móvil medio; JS inicial < 250 KB gzip.

## 11. Accesibilidad

- `prefers-reduced-motion: reduce` → **[ACEPTADA]** ir directo a la escena 15 (con opción "Play the animation" para verla igual).
- Todo el texto en HTML real, no dentro del canvas. Canvas con `aria-hidden="true"`.
- Botón Skip y links accesibles por teclado, con foco visible.
- Contraste suficiente (texto rojo sobre negro de la escena 7: usar un rojo claro tipo `#ff4d4d`).

## 12. Despliegue en GitHub Pages

- Repo asumido: **`darshanperez/darshanperez.github.io`** → sitio en `https://darshanperez.github.io/` y `base: '/'`.
  - Si se usa otro nombre de repo → `base: '/<repo>/'`.
- Todas las rutas a assets y el `fetch` del CSV deben usar `import.meta.env.BASE_URL`.
- GitHub Actions: workflow oficial de Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`) que corre `npm ci && npm run build` y publica `dist/`.
- Agregar `public/.nojekyll`.

## 13. Textos (inglés) — propuesta de copy

Textos corregidos y pulidos a partir del sketch. Van al CSV.

| key | Sketch original | **[ACEPTADA]** en | es |
|---|---|---|---|
| `intro.title` | darshan's Portafolio | Darshan's Portfolio | Portafolio de Darshan |
| `intro.skip` | skip the animation > | Skip the animation → | Saltar animación → |
| `intro.scroll` | — | Scroll to explore | Desliza para explorar |
| `profile.role` | full-stack developer | Full-stack developer | Desarrollador full-stack |
| `profile.desc` | (description) | I build software end to end — from the interface people touch to the servers that keep it running. | Construyo software de principio a fin: desde la interfaz que usas hasta los servidores que la mantienen en pie. |
| `servers.pre` | experience with | Experience with | Experiencia en |
| `servers.main` | servers managment | server management | administración de servidores |
| `security.main` | with cybersecurity aproach | with a cybersecurity approach | con enfoque en ciberseguridad |
| `projects.heading` | the experience what you need | The experience you need | La experiencia que necesitas |
| `skills.heading` | Skills & Tools | Skills & Tools | Habilidades y herramientas |
| `about.name` | darshan perez | Darshan Perez | Darshan Perez |
| `about.subtitle` | computer science | Computer Science | Ciencias de la Computación |
| `about.resume` | — | Download résumé | Descargar CV |

Frase completa de los actos 2–3, leída en secuencia: *"Experience with server management… with a cybersecurity approach."*

## 14. Pendientes de Darshan

- [x] Foto de perfil: **placeholder incluido** (`public/media/profile.webp`, 800×800). Darshan la reemplaza después con el mismo nombre.
- [x] URLs de LinkedIn, GitHub, correo, Codeforces y Modrinth.
- [x] Repo de GitHub Pages (asumido `darshanperez.github.io`).
- [x] CV: **placeholder incluido** (`public/cv/darshan-perez-resume.pdf`, 1 página). Darshan lo reemplaza después con el mismo nombre.
- [x] Paleta y escala tipográfica (§17).
- [x] Fuentes (§17.3).
- [ ] Descripción corta y larga + video/imagen de cada proyecto.
- [ ] Lista definitiva de skills/herramientas.
- [ ] Contenido del CV (PDF) y resumen para la escena 15.
- [ ] Confirmar copy de §13 y si el apellido lleva acento (Pérez).

## 15. Plan de trabajo sugerido

1. **Base:** Vite + renderer + Lenis + timeline maestra con escenas vacías (cubos placeholder) + i18n CSV + Skip + deploy en Pages funcionando.
2. **Actos 1–2:** portada, perfil, servidores procedurales, zoom de cámara.
3. **Acto 3:** candado procedural con apertura/cierre y rebote.
4. **Acto 4:** sistema de ventanas data-driven, principales/secundarias, luz + bloom, transición a blanco.
5. **Acto 5:** marquee de skills + escena 15 completa.
6. **Pulido:** móvil (iOS/Android reales), reduced motion, rendimiento, Lighthouse.
7. **SFX (efectos visuales):** capa de realismo al final del proyecto, con referencia a renders tipo producto (metal negro brillante, reflejos y brillos dramáticos sobre fondo negro). Iluminación/HDRI, materiales realistas, post-procesado (bloom, viñeta, grano, profundidad de campo). Entra por dos puntos preparados desde antes: `src/core/fx.js` (pipeline de render, hoy un render directo) y `src/core/materials.js` (materiales por rol). Hasta esta fase: sin luces de color, brillos ni degradados decorativos.

Cada fase termina con un deploy a Pages para revisar en el teléfono.

## 16. Criterios de aceptación

- El scroll hacia adelante y hacia atrás reproduce las escenas de forma reversible y fluida.
- Skip lleva a la escena 15 desde cualquier punto; `#about` abre directo ahí.
- Añadir un proyecto nuevo solo requiere tocar `projects.js`, `strings.csv` y agregar su media.
- Cambiar a `?lang=es` traduce todo el sitio sin recargar código.
- Funciona en Chrome, Firefox y Safari (escritorio y móvil) sin errores en consola.
- Lighthouse (escena 15 / carga inicial): Performance ≥ 80 en móvil, Accessibility ≥ 90.

## 17. Sistema de diseño

> Principios: estilo profesional tipo Apple, **2 negros + 2 blancos** como base con grises derivados, **un acento principal** (iris, azul-morado) y **un acento semántico** (rojo, uso mínimo). Colores definidos en **OKLCH** (luminosidad perceptualmente uniforme) y verificados con contraste **WCAG AA**.

### 17.1 Color — DECIDIDO

Todos los neutros llevan un tinte casi imperceptible del mismo tono que el acento (H = 285°), para que el conjunto se lea unificado.

| Token | Hex | OKLCH | Uso |
|---|---|---|---|
| `--ink` | `#070709` | `oklch(0.13 0.006 285)` | Negro 1: fondo de escenas 1–12 |
| `--graphite` | `#19191D` | `oklch(0.215 0.008 285)` | Negro 2: superficies elevadas en oscuro, texto principal sobre claro |
| `--mist` | `#F3F3F7` | `oklch(0.965 0.005 285)` | Blanco 2: superficies en claro, texto principal sobre oscuro |
| `--snow` | `#FAFAFC` | `oklch(0.985 0.003 285)` | Blanco 1: fondo de escenas 13–15 |
| `--gray-on-dark` | `#A4A4AB` | `oklch(0.72 0.010 285)` | Texto secundario sobre oscuro (8.1:1 sobre `--ink`) |
| `--gray-on-light` | `#686870` | `oklch(0.52 0.012 285)` | Texto secundario sobre claro (5.0:1 sobre `--mist`) |
| `--accent-on-dark` | `#9992FA` | `oklch(0.71 0.15 285)` | **Iris**: links, foco, LEDs, detalles 3D sobre oscuro (7.5:1 sobre `--ink`) |
| `--accent-on-light` | `#5E45CD` | `oklch(0.50 0.20 285)` | **Iris** sobre claro (5.9:1 sobre `--mist`) |
| `--danger` | `#FF534B` | `oklch(0.68 0.21 27)` | Solo semántico: texto del candado abierto (escena 7), errores (6.6:1 sobre `--ink`) |

Reglas:
- Más tonos intermedios (bordes, hovers, overlays) se derivan con `color-mix(in oklch, …)` entre estos tokens o bajando la luminosidad L en OKLCH; **no** se agregan hex nuevos sueltos.
- Bordes: `color-mix(in oklch, var(--mist) 12%, transparent)` en oscuro; `color-mix(in oklch, var(--graphite) 10%, transparent)` en claro.
- El acento se usa con moderación: links, estado de foco, LEDs de servidores, brillo de las ventanas principales. Nunca como fondo de grandes superficies.
- La luz de la escena 11–13 es blanca (`--snow`) con un halo ligeramente iris.
- En 3D, convertir los tokens a `THREE.Color` (espacio lineal) desde la misma fuente (`src/styles/tokens.js`) para que CSS y WebGL coincidan.
- No usar `opacity` en texto para hacerlo secundario: usar los grises definidos.

### 17.2 Escala tipográfica — DECIDIDO

Proporción áurea (φ ≈ 1.618), base 17 px, **5 tamaños**:

| Token | Tamaño | Uso | line-height | letter-spacing |
|---|---|---|---|---|
| `--fs-caption` | 13 px (17/√φ) | Etiquetas, metadatos, nombres de tools | 1.4 | 0.01em |
| `--fs-body` | 17 px | Texto, descripciones | 1.5 | 0 |
| `--fs-title` | 27 px | Títulos de proyecto, subtítulos | 1.2 | -0.01em |
| `--fs-heading` | 44 px | Encabezados de sección | 1.1 | -0.02em |
| `--fs-display` | 72 px | Textos cinematográficos de las escenas | 1.0 | -0.03em |

- Fluido en móvil con `clamp()`: `--fs-display: clamp(44px, 8vw, 72px)`, `--fs-heading: clamp(27px, 5vw, 44px)` (el mínimo de cada uno es el paso anterior de la escala).
- Solo 2 pesos: 400 y 600.
- Espaciado: rejilla de 8 px (4 px para ajustes finos).

### 17.3 Tipografía — DECIDIDO

| Rol | Fuente | Pesos | Uso |
|---|---|---|---|
| Texto y títulos | **Instrument Sans** | 400, 600 | Todo el texto: escenas cinematográficas, títulos, cuerpo, botones |
| Mono | **Fragment Mono** | 400 | Etiquetas técnicas, comandos decorativos (`$ ssh server-01`), tags de tecnologías, nombres de tools en la escena 14, bloques de código de la escena 15 |

- Ambas con licencia OFL. Autoalojadas en `public/fonts/` (woff2, subset latin + latin-ext para acentos en español), `font-display: swap`.
- Precargar (`<link rel="preload">`) solo Instrument Sans 600, que aparece en la escena 1.
- Fallbacks: `"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif` y `"Fragment Mono", ui-monospace, "SF Mono", Menlo, monospace`.
- Mono siempre en `--fs-caption` (13 px) o `--fs-body` (17 px), nunca en tamaños display.
- Tracking negativo en títulos según la tabla de §17.2; la mono se deja sin tracking.

```css
:root {
  --font-sans: "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Fragment Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
```

## 18. Lenguaje de movimiento — DECIDIDO (valores recomendados)

> Igual que la paleta define qué colores se usan, esto define **cómo se mueve todo**: duraciones, curvas (easings) y patrones. Todo movimiento del sitio sale de estos tokens; no se inventan valores sueltos.

### 18.1 Duraciones (escala φ, base 200 ms)

Misma proporción áurea que la tipografía: cada paso es el anterior × 1.618.

| Token | Duración | Uso |
|---|---|---|
| `--dur-micro` | 200 ms | Hover, foco, color de links, botones |
| `--dur-ui` | 320 ms | Selector de idioma, aparición de tarjetas, iconos de la escena 15 |
| `--dur-exit` | 520 ms | Salida de textos (las salidas son más cortas que las entradas) |
| `--dur-enter` | 840 ms | Entrada de textos |
| `--dur-scene` | 1370 ms | Transiciones grandes basadas en tiempo: loader, rebote del candado + cambio de color del texto |

- Nada basado en tiempo dura más de ~1.4 s; lo que necesita ser más largo va atado al scroll.
- En las escenas con scrub, la "duración" es distancia de scroll (`scrollLength` de §5), no milisegundos.

### 18.2 Curvas

| Token | GSAP | CSS | Cuándo |
|---|---|---|---|
| `ease-enter` | `expo.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Algo **entra**: llega rápido y se asienta suave |
| `ease-exit` | `power2.in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Algo **sale**: arranca suave y acelera al irse |
| `ease-move` | `power2.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Algo **se mueve** dentro de la pantalla (cámara, objetos) |
| `ease-bounce` | `back.out(1.6)` | — | Solo el cierre del candado |
| `linear` | `none` | `linear` | Solo loops continuos (marquee de skills, rotaciones idle) |

### 18.3 Patrón de texto (por defecto en todo el sitio)

Fade con ligero zoom, siempre en la dirección del viaje (la experiencia avanza hacia la cámara):

| | Opacidad | Escala | Duración | Curva |
|---|---|---|---|---|
| Entrada | 0 → 1 | 0.96 → 1 | `--dur-enter` | `ease-enter` |
| Salida | 1 → 0 | 1 → 1.04 | `--dur-exit` | `ease-exit` |

- Textos de varias líneas: stagger de **80 ms** por línea.
- `transform-origin: center`. Solo se animan `opacity` y `transform` (GPU); nunca `top/left/width/font-size`.
- Sin blur en la animación (costoso en móvil).
- **Disparo:** en las escenas cinematográficas el texto se dispara al cruzar un punto del scroll y se reproduce en tiempo real con estos valores (`toggleActions: 'play reverse play reverse'`); así siempre se ve fluido, aunque el usuario haga scroll muy lento o muy rápido. Los objetos 3D y la cámara sí van en scrub.

### 18.4 Scroll

- Lenis: `lerp: 0.1` (inercia suave), `wheelMultiplier: 1`.
- ScrollTrigger en escenas 3D: `scrub: 1` (1 s de "alcance"): suaviza los tirones de la rueda del mouse.
- Marquee de skills: velocidad constante ~40 px/s, `linear`, pausa en hover.

### 18.5 Reglas anti-"tosco"

1. Nunca `linear` en entradas, salidas o movimientos de cámara.
2. Las salidas duran ~⅔ de las entradas.
3. No animar todo a la vez: stagger y escalonar texto vs. 3D (el texto entra ~200 ms después de que el objeto 3D se asienta).
4. Una sola dirección de viaje: las cosas entran creciendo y salen pasando la cámara.
5. 60 fps: solo `transform`/`opacity` en DOM; en 3D, nada de crear geometrías durante la animación.
6. `prefers-reduced-motion`: ver §11 (directo a la escena 15; en la escena 15 los reveals pasan a fade simple de 200 ms sin escala).

```css
:root {
  --dur-micro: 200ms; --dur-ui: 320ms; --dur-exit: 520ms; --dur-enter: 840ms; --dur-scene: 1370ms;
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.55, 0, 1, 0.45);
  --ease-move: cubic-bezier(0.65, 0, 0.35, 1);
}
```
