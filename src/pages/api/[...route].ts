import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { db } from '../../../db';
import { movimientos, categorias } from '../../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { APIRoute } from 'astro';

const app = new Hono().basePath('/api');
app.use('*', logger());

app.get('/movimientos', async (c) => {
  const result = await db.select({
    id: movimientos.id,
    fecha: movimientos.fecha,
    tipo: movimientos.tipo,
    descripcion: movimientos.descripcion,
    monto: movimientos.monto,
    medioPago: movimientos.medioPago,
    categoria: categorias.nombre,
  })
  .from(movimientos)
  .leftJoin(categorias, eq(movimientos.categoriaId, categorias.id))
  .orderBy(desc(movimientos.fecha));
  
  return c.json(result);
});

const createMovimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  descripcion: z.string().min(1),
  monto: z.number().positive(),
  categoriaId: z.string().uuid().optional(),
  medioPago: z.string().optional(),
});

app.post('/movimientos', zValidator('json', createMovimientoSchema), async (c) => {
  const data = c.req.valid('json');
  const [newMovimiento] = await db.insert(movimientos).values({
    ...data,
    monto: data.monto.toString(),
  }).returning();
  
  return c.json(newMovimiento, 201);
});

app.delete('/movimientos/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(movimientos).where(eq(movimientos.id, id));
  return c.json({ success: true });
});

app.get('/resumen', async (c) => {
  const result = await db.select({
    tipo: movimientos.tipo,
    total: sql<number>`sum(cast(${movimientos.monto} as numeric))`
  }).from(movimientos).groupBy(movimientos.tipo);

  let ingresos = 0;
  let egresos = 0;

  result.forEach(row => {
    if (row.tipo === 'ingreso') ingresos = Number(row.total);
    if (row.tipo === 'egreso') egresos = Number(row.total);
  });

  return c.json({
    ingresos,
    egresos,
    saldo: ingresos - egresos
  });
});

app.get('/categorias', async (c) => {
  const result = await db.select().from(categorias);
  return c.json(result);
});

app.post('/categorias', zValidator('json', z.object({ nombre: z.string().min(1) })), async (c) => {
  const data = c.req.valid('json');
  const [newCategoria] = await db.insert(categorias).values(data).returning();
  return c.json(newCategoria, 201);
});

const handle = (context: any) => app.fetch(context.request);

export const ALL: APIRoute = handle;
