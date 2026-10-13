# Lizzy Torres · Renta de sillas y mesas

Aplicación adaptable a celular y PC, con cuentas, sesiones y base de datos SQLite centralizada. Requiere Node.js 24 o superior, sin dependencias externas.

## Desarrollo

```sh
cd /workspace/master
npm test
LIZZY_LOCAL_HTTP=1 npm start
```

El modo HTTP local escucha exclusivamente en 127.0.0.1. En producción usa `npm start` sin esa variable detrás de un proxy HTTPS del mismo origen; las cookies Secure no funcionan sobre HTTP público. `PORT` configura el puerto. No se ha desplegado un servicio público.

## Cuentas administrativas

Solo la herramienta privada de administración crea cuentas administrativas. El registro público siempre crea un cliente, incluso si la solicitud incluye un rol diferente. Elizabeth y Manuel deben tener cuentas y contraseñas independientes. Los correos administrativos están vinculados en la base de datos del entorno. Sus cuentas permanecen desactivadas hasta establecer contraseñas privadas; no existen contraseñas por defecto.

Desde una terminal privada, activa cada cuenta reservada así (sustituye el correo; la contraseña no se muestra ni queda en el historial):

```bash
cd /workspace/master
read -rs -p 'Contraseña (mínimo 12 caracteres): ' lizzy_admin_password
printf '\n'
printf '%s' "$lizzy_admin_password" | node admin.js elizabeth meme.delgam@icloud.com
unset lizzy_admin_password
```

Repite con `manuel` y el correo `memedelgam@gmail.com`. No pases contraseñas como argumentos ni las compartas en el chat. Las contraseñas se guardan mediante scrypt con una sal aleatoria; las sesiones de 12 horas usan cookies HttpOnly, SameSite=Strict y Secure por defecto. Se comprueban CSRF, permisos, dueño del pedido y versiones concurrentes en el servidor. Hay límite de intentos de acceso/registro por dirección de conexión (20 por 15 minutos); detrás de un proxy compartido este límite se comparte y debe ajustarse antes de tráfico significativo.

## Permisos y pedidos

- Elizabeth y Manuel: todos los pedidos, inventario y dashboard; flete, promociones, pagos, cotización, confirmación, entrega y devolución.
- Clientes: registro, creación y consulta de sus propios pedidos; aceptación de su cotización final. No acceden a otros pedidos ni pueden modificar pagos, descuentos o estados administrativos.
- Al cambiar datos o importes del pedido, vuelve a revisión y debe cotizarse y aceptarse nuevamente. Registrar un anticipo no invalida la aceptación.
- Para pedidos capturados por administración, vincula el correo de una cuenta de cliente ya registrada. Sin esa vinculación puede guardarse el pedido, pero no cotizarse ni cerrarse mediante el flujo de aceptación digital.

La base de datos por defecto está en `/workspace/lizzy-data/app.sqlite`, fuera del repositorio. El directorio debe existir y ser privado; `LIZZY_DB_PATH` permite usar otra ubicación persistente. Los datos sobreviven al reinicio del servidor. Para uso público se necesita alojamiento HTTPS, almacenamiento persistente y backups; la configuración del entorno de desarrollo no publica la aplicación ni garantiza backups operativos. No se migran automáticamente los antiguos pedidos de localStorage.

## Validación y pendientes

`npm test` comprueba tarifas, descuentos, inventario compartido, acceso no autenticado, aislamiento entre clientes, intentos de elevar permisos, CSRF, aceptación del cliente, cambio de total, versiones concurrentes, cierre de sesión y persistencia después de reabrir SQLite.

Pendientes: activación de las dos cuentas mediante contraseñas privadas, recuperación/verificación de correo, comprobantes y datos bancarios, importación del Excel, inventario de manteles, logo original y fotos, dashboard por municipio/periodo y pruebas visuales en navegador. No se ha importado información personal del Excel. Los pagos se registran manualmente después de verificar la transferencia.

La disponibilidad bloquea el día del evento y el día de recolección completos, hasta registrar devolución. Es una regla conservadora mientras se incorporan horarios efectivos y retrasos. El dashboard muestra importe contratado separado del anticipo y saldo; no mide utilidad.

## Descripción original del repositorio

# master
App de la renta de sillas y mesas , aqui tengo el control el master de la app


## Render

El archivo `render.yaml` declara un Web Service con un disco persistente de 1 GB y Node.js 24.19.0. El plan `starter` es de pago: revisa disponibilidad y precio vigente en Render antes de crear el servicio. Puedes usar New > Blueprint con este repositorio o configurar New > Web Service manualmente: build `npm test`, start `npm start`, disco `/var/data`, variable `LIZZY_DB_PATH=/var/data/app.sqlite`, y `NODE_VERSION=24.19.0`. No configures `LIZZY_LOCAL_HTTP`.

El arranque ejecuta `bootstrap.js`, crea el directorio de datos y reserva las cuentas de Elizabeth y Manuel desactivadas. Es repetible y no cambia contraseñas ni pedidos existentes. Al desplegar, usa la Shell privada de Render para ejecutar las instrucciones de activación anteriores desde la carpeta del proyecto (en Render usa el directorio de trabajo del servicio, no `/workspace/master`). No publiques esa terminal ni compartas contraseñas en capturas. El disco del despliegue es independiente de los datos del entorno de desarrollo. No subas bases de datos, archivos Excel, contraseñas ni comprobantes al repositorio.
