# Next Drones Shop

Tienda demo de drones ficticios: **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **react-hook-form**, carrito con **useReducer** + **Context**, persistencia en **localStorage**.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Nombre de la tienda

Por defecto el nombre mostrado es **Next Drones**. Puedes cambiarlo con `NEXT_PUBLIC_SHOP_NAME` o `SHOP_NAME` (mismo efecto) en [`.env.local.example`](.env.local.example) — copia a `.env.local` y ajusta. El valor se lee **en tiempo de ejecución**; reinicia el servidor de desarrollo tras cambiarlo.

## Producción (local)

```bash
npm run build
npm start
```

## Docker

Requiere Docker instalado.

Construir la imagen (desde la raíz del repo):

```bash
docker build -t next-drones .
```

Ejecutar en el puerto 3000:

```bash
docker run -p 3000:3000 next-drones
```

Abre [http://localhost:3000](http://localhost:3000).

El nombre de la tienda se puede pasar al **arrancar** el contenedor (también admite `SHOP_NAME`):

```bash
docker run -e NEXT_PUBLIC_SHOP_NAME="Ivan Drones" -p 3000:3000 next-drones
```

El `Dockerfile` usa la salida **standalone** de Next.js (Node 20 Alpine, usuario no root). La app raíz usa renderizado dinámico para leer el entorno en cada petición.

## Flujo

1. Catálogo: añade drones al carrito.
2. **Carrito**: revisa líneas, **Comprar** abre el formulario.
3. Formulario: correo (validación), teléfono (≥9 dígitos), dirección.
4. **Comprar** muestra un mensaje de agradecimiento con el nombre de la tienda (variables `NEXT_PUBLIC_SHOP_NAME` o `SHOP_NAME`) y vacía el carrito.
