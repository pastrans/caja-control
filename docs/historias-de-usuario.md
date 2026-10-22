# Historias de usuario — caja-control

Backlog generado a partir del análisis del frontend (22/10/2026). Cada historia incluye su prioridad, sus criterios de aceptación y notas técnicas con los archivos afectados.

**Prioridad:** 🔴 Alta · 🟡 Media · 🟢 Baja
**Roles:** *Administrador* (ADMIN), *Cajero* (CASHIER), *Desarrollador* (mantenimiento interno)

| ID | Historia | Prioridad | Estado |
|---|---|---|---|
| US-01 | No abrir una caja nueva por un error de conexión | 🔴 | Pendiente |
| US-02 | Cerrar sesión automáticamente al expirar el token | 🔴 | Pendiente |
| US-03 | Poder cerrar una caja con $0 en efectivo | 🔴 | Pendiente |
| US-04 | Cálculos de dinero exactos y validados por el servidor | 🔴 | Pendiente |
| US-05 | Configuración de entornos clara y sin archivos generados en git | 🟡 | Pendiente |
| US-06 | Carga inicial más rápida (lazy loading) | 🟡 | Pendiente |
| US-07 | Ver todos los empleados al registrar un cobro | 🟡 | Pendiente |
| US-08 | Tipado estricto en las respuestas de la API | 🟡 | Pendiente |
| US-09 | Pruebas unitarias de la lógica crítica | 🟢 | Pendiente |
| US-10 | Limpieza de código y estado consistente | 🟢 | Pendiente |
| US-11 | Documentación del proyecto | 🟢 | Pendiente |
| US-12 | Dashboard de ventas como pantalla de inicio | 🔴 | En revisión |

---

## US-01 · No abrir una caja nueva por un error de conexión 🔴

**Como** cajero
**quiero** que, si la API falla al consultar la caja activa, se me muestre un error en lugar de mandarme a "Abrir caja"
**para** no abrir una segunda caja por accidente ni perder de vista la que ya está abierta.

### Criterios de aceptación
- **Dado** que existe una caja abierta, **cuando** la consulta de caja activa falla (500, timeout o sin red), **entonces** la pantalla de Caja muestra un mensaje de error con un botón **Reintentar** y **no** redirige a `/abrir-caja`.
- **Dado** que la API responde que no hay caja activa (404 o cuerpo vacío), **cuando** entro a `/caja`, **entonces** se me redirige a `/abrir-caja`, como hasta ahora.
- **Dado** que estoy en `/abrir-caja` y la consulta falla, **entonces** no se habilita el formulario de apertura hasta que la consulta tenga éxito.

### Notas técnicas
- [caja.service.ts](../src/app/services/caja.service.ts): `getActiveCaja()` usa `catchError(() => of(null))`, que oculta cualquier error. Solo debe convertir en `null` el caso de "no hay caja" y relanzar los demás errores.
- [caja.component.ts](../src/app/pages/caja/caja.component.ts) y [abrir-caja.component.ts](../src/app/pages/abrir-caja/abrir-caja.component.ts): manejar el `error` sin redirigir.

---

## US-02 · Cerrar sesión automáticamente al expirar el token 🔴

**Como** usuario
**quiero** que la aplicación detecte cuando mi sesión expiró y me lleve al login
**para** no trabajar en pantallas que van a fallar al guardar.

### Criterios de aceptación
- **Dado** un JWT con `exp` vencido en `localStorage`, **cuando** abro la app, **entonces** se me redirige a `/login` sin hacer peticiones a la API.
- **Dado** que la sesión expira mientras uso la app, **cuando** navego a otra ruta, **entonces** el `authGuard` me manda al login.
- **Dado** que el servidor responde 401, **entonces** se mantiene el comportamiento actual del interceptor (logout y redirección).

### Notas técnicas
- [auth.service.ts](../src/app/services/auth.service.ts): `isAuthenticated` solo revisa que haya un usuario guardado. Hay que decodificar el payload del token y comparar `exp` con la hora actual.
- Evaluar a futuro el uso de cookies `HttpOnly` en lugar de `localStorage` (protección ante XSS).

---

## US-03 · Poder cerrar una caja con $0 en efectivo 🔴

**Como** cajero
**quiero** registrar un cierre con conteo de $0
**para** cerrar cajas que abrieron en cero o a las que se les retiró todo el efectivo.

### Criterios de aceptación
- **Dado** un conteo de $0.00, **cuando** confirmo el cierre, **entonces** el formulario es válido y se envía.
- **Dado** que el conteo de $0 no coincide con el esperado, **entonces** se exige una nota, igual que con cualquier diferencia.
- No se permiten montos negativos.

### Notas técnicas
- [cierre-caja.component.ts](../src/app/components/cierre-caja/cierre-caja.component.ts): cambiar `Validators.min(0.01)` por `Validators.min(0)` en `cashCount`. Así queda igual que la apertura, que ya permite 0.

---

## US-04 · Cálculos de dinero exactos y validados por el servidor 🔴

**Como** administrador
**quiero** que los totales, el efectivo esperado y la diferencia del cierre se calculen sin errores de redondeo y los confirme el servidor
**para** confiar en el historial y en los reportes.

### Criterios de aceptación
- **Dado** cualquier combinación de cobros con centavos, **cuando** se calcula el total, **entonces** no aparecen valores como `0.30000000000000004`.
- **Dado** un cierre, **cuando** se envía, **entonces** el backend recalcula `totalExpected` y `difference` a partir de sus propios registros y rechaza o corrige los valores del cliente.
- Las sumas del frontend se hacen en centavos (enteros) y se convierten a pesos solo al mostrarlas o enviarlas.

### Notas técnicas
- Afecta a [cierre-caja.component.ts](../src/app/components/cierre-caja/cierre-caja.component.ts) (`reduce` de transacciones y movimientos), a [caja.component.ts](../src/app/pages/caja/caja.component.ts) (`totalModal`, `changeReturned`) y a [historial.component.ts](../src/app/pages/historial/historial.component.ts).
- Crear un helper compartido en `utils/` (por ejemplo `money.utils.ts`) con `sumar`, `restar` y `aCentavos`.
- Requiere cambios en el backend (`caja-api`, endpoint `POST /cash-registers/close`).

---

## US-05 · Configuración de entornos clara y sin archivos generados en git 🟡

**Como** desarrollador
**quiero** que la configuración por entorno sea consistente
**para** que el build no ensucie el repositorio y no haya confusión entre desarrollo y producción.

### Criterios de aceptación
- `src/environments/environment.prod.ts` deja de estar versionado (`git rm --cached`) y solo lo genera `generate-env.js`.
- `environment.ts` tiene `production: false`.
- `.env` deja de estar versionado; queda solo `.env.template` como referencia.
- Después de `npm run build`, `git status` no muestra archivos modificados.

### Notas técnicas
- `.gitignore` ya ignora `environment.prod.ts`, pero el archivo se versionó antes de agregarlo.
- `generate-env.js` lee `process.env` y no carga `.env`, así que hoy `.env` no tiene ningún efecto.

---

## US-06 · Carga inicial más rápida (lazy loading) 🟡

**Como** cajero
**quiero** que la aplicación cargue rápido en el equipo de la caja
**para** empezar a cobrar sin esperar.

### Criterios de aceptación
- Las rutas usan `loadComponent` y cada página se descarga solo al visitarla.
- Un cajero no descarga el código de Inicio, Usuarios ni Empleados.
- El bundle inicial de producción baja del presupuesto de 500 kB definido en `angular.json` (hoy es de unos 840 kB).

### Notas técnicas
- [app.routes.ts](../src/app/app.routes.ts).
- Revisar el CSS de Bootstrap completo (unos 370 kB) como posible candidato a optimizar.

---

## US-07 · Ver todos los empleados al registrar un cobro 🟡

**Como** cajero
**quiero** que el selector de empleados muestre a todos los empleados habilitados
**para** poder asignar cualquier venta a quien corresponde.

### Criterios de aceptación
- **Dado** que hay más de 100 empleados habilitados, **cuando** abro la pantalla de Caja, **entonces** aparecen todos en el selector.

### Notas técnicas
- [caja.component.ts](../src/app/pages/caja/caja.component.ts): `getEmpleados(1, 100)` tiene un límite fijo. Hay que crear un endpoint `GET /employees?available=true` sin paginar, o recorrer todas las páginas.

---

## US-08 · Tipado estricto en las respuestas de la API 🟡

**Como** desarrollador
**quiero** que las respuestas y los formularios tengan tipos explícitos
**para** detectar en compilación los errores de integración con el backend.

### Criterios de aceptación
- No hay `any` en servicios ni mappers: `registerTransaction`, `registerCashInOut`, `toCreatePayload` y `toUpdatePayload`.
- Se elimina `null as any` en el payload de cierre y el tipo de `note` pasa a ser `string | null`.
- Los formularios reactivos usan `FormGroup` tipado.

### Notas técnicas
- [caja.service.ts](../src/app/services/caja.service.ts), [usuario.model.ts](../src/app/models/usuario.model.ts), [cierre-caja.component.ts](../src/app/components/cierre-caja/cierre-caja.component.ts).
- `PaginatedResponse` está duplicado en `empleado.model.ts` y `pagination.models.ts`; dejar solo uno.

---

## US-09 · Pruebas unitarias de la lógica crítica 🟢

**Como** desarrollador
**quiero** pruebas automáticas de la lógica que maneja dinero y permisos
**para** hacer cambios sin miedo a romper el cierre de caja.

### Criterios de aceptación
- `ng test` termina en verde (hoy `app.component.spec.ts` espera un `<h1>` que ya no existe).
- Hay pruebas de `CajaMapper`, `UsuarioMapper`, `EmpleadoMapper`, del cálculo del esperado y la diferencia en el cierre, de `authGuard`, `roleGuard`, `publicGuard` y `homeGuard`, y de `AppValidators`.

---

## US-10 · Limpieza de código y estado consistente 🟢

**Como** desarrollador
**quiero** un código sin archivos huérfanos y con un solo patrón de estado
**para** mantenerlo más fácil.

### Criterios de aceptación
- Se elimina `src/app/pages/abrir-caja/abrir-caja.css`, que no está referenciado.
- `CajaComponent` usa `signal` para `activeSession`, `records` y `cashRecords`, como en `HistorialComponent`.
- Se acuerda un idioma para los nombres de variables y métodos (por ejemplo, `empleadas` → `empleados`).

---

## US-11 · Documentación del proyecto 🟢

**Como** desarrollador nuevo en el proyecto
**quiero** un README que explique qué es la app y cómo correrla
**para** poder levantar el entorno sin preguntar.

### Criterios de aceptación
- El README describe el propósito, los roles, las variables de entorno (`API_URL`), cómo correr la app junto a `caja-api` y el despliegue en Railway.

---

## US-12 · Dashboard de ventas como pantalla de inicio 🔴

**Como** administrador
**quiero** ver al entrar un resumen de las ventas del negocio
**para** saber cómo vamos hoy, en la semana, el mes y el año, y quién está vendiendo más.

### Criterios de aceptación
- **Rutas**
  - Existe la ruta `/inicio`, protegida para el rol ADMIN.
  - Al entrar a `/`, al iniciar sesión o al visitar `/login` con sesión activa, un ADMIN llega a `/inicio` y un cajero a `/caja`.
  - Los botones de las páginas 403 y 404 y el logo de la barra llevan al inicio que corresponde al rol.
  - La barra de navegación muestra **Inicio** solo a los ADMIN.
- **Resumen (`GET /dashboard/summary`)**
  - Cuatro tarjetas (Hoy, Esta semana, Este mes, Este año) con el total vendido, el número de ventas y el ticket promedio.
- **Filtros**
  - Rangos rápidos (7 días, 30 días, Este mes, Este año) y fechas personalizadas *desde / hasta*.
  - "Este año" agrupa por mes de forma predeterminada.
- **Ventas en el tiempo (`GET /dashboard/sales-over-time`)**
  - Gráfica de barras con agrupación por Día, Semana o Mes, con tooltip al pasar el cursor y un botón para cambiar a vista de tabla.
  - Los periodos sin ventas aparecen en 0.
- **Ventas por empleado (`GET /dashboard/sales-by-employee`)**
  - Ranking de mayor a menor con total, porcentaje, número de ventas y ticket promedio. Los empleados inactivos se marcan como tales.
  - Al hacer clic en un empleado (o al elegirlo en el selector), la gráfica muestra solo sus ventas; un segundo clic quita el filtro.
- **Errores**
  - Los errores `400 { error }` del backend se muestran en la alerta de la página.

### Notas técnicas
- Implementado en [inicio.component.ts](../src/app/pages/inicio/inicio.component.ts), [dashboard.service.ts](../src/app/services/dashboard.service.ts), [dashboard.model.ts](../src/app/models/dashboard.model.ts) y [home.guard.ts](../src/app/guards/home.guard.ts), más `AuthService.homeUrl()`.
- La gráfica está hecha con HTML y CSS, sin librerías nuevas.
- Pendiente: verificarlo con datos reales y agregar pruebas (ver US-09).
