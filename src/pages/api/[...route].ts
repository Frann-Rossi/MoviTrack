import { Hono } from 'hono';
import { logger } from 'hono/logger';
import Groq from 'groq-sdk';
import { format } from 'date-fns';
import { db } from '../../../db';
import { movimientos, categorias } from '../../../db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { APIRoute } from 'astro';
import { auth } from '../../lib/auth';

type Variables = {
  user: { id: string; name: string; email: string };
};

const app = new Hono<{ Variables: Variables }>().basePath('/api');
app.use('*', logger());
app.use('*', async (c, next) => {
  console.log(`[API] Request: ${c.req.method} ${c.req.path}`);
  const start = Date.now();
  await next();
  const end = Date.now();
  console.log(`[API] Response: ${c.req.method} ${c.req.path} - ${c.res.status} (${end - start}ms)`);
});

// Exponer rutas de Better Auth
app.on(['POST', 'GET'], '/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// Middleware de autenticación
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth')) {
    return next();
  }
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: 'No autorizado' }, 401);
  }
  c.set('user', session.user);
  await next();
});
const getDateFilters = (month?: string, year?: string, day?: string) => {
  if (!month || !year) return null;
  
  const filters = [
    eq(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`, Number(month)),
    eq(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`, Number(year))
  ];

  if (day) {
    filters.push(eq(sql`EXTRACT(DAY FROM ${movimientos.fecha})`, Number(day)));
  }

  return and(...filters);
};

app.get('/movimientos', async (c) => {
  const user = c.get('user');
  const month = c.req.query('month');
  const year = c.req.query('year');
  const day = c.req.query('day');

  let query = db.select({
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
  .where(eq(movimientos.userId, user.id))
  .$dynamic();

  const dateFilter = getDateFilters(month, year, day);
  if (dateFilter) {
    query = query.where(dateFilter);
  }

  const result = await query.orderBy(desc(movimientos.fecha));
  
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
  const user = c.get('user');
  const [newMovimiento] = await db.insert(movimientos).values({
    ...data,
    userId: user.id,
    monto: data.monto.toString(),
  }).returning();
  
  return c.json(newMovimiento, 201);
});

app.delete('/movimientos/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  await db.delete(movimientos).where(and(eq(movimientos.id, id), eq(movimientos.userId, user.id)));
  return c.json({ success: true });
});

app.get('/resumen', async (c) => {
  const user = c.get('user');
  const month = c.req.query('month');
  const year = c.req.query('year');
  const day = c.req.query('day');

  let conditions = [eq(movimientos.userId, user.id)];
  const dateFilter = getDateFilters(month, year, day);
  if (dateFilter) {
    conditions.push(dateFilter as any);
  }

  const result = await db.select({
    tipo: movimientos.tipo,
    total: sql<number>`sum(cast(${movimientos.monto} as numeric))`
  }).from(movimientos)
    .where(and(...conditions))
    .groupBy(movimientos.tipo);

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

app.post('/chat', zValidator('json', z.object({ 
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).min(1) 
 })), async (c) => {
  const { messages } = c.req.valid('json');
  const user = c.get('user');
  const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

  // Obtener contexto de los últimos movimientos del usuario
  const recentMovimientos = await db.select({
    fecha: movimientos.fecha,
    tipo: movimientos.tipo,
    descripcion: movimientos.descripcion,
    monto: movimientos.monto,
    categoria: categorias.nombre,
  })
  .from(movimientos)
  .leftJoin(categorias, eq(movimientos.categoriaId, categorias.id))
  .where(eq(movimientos.userId, user.id))
  .orderBy(desc(movimientos.fecha))
  .limit(50);

  const context = recentMovimientos.map(m => 
    `- ${format(new Date(m.fecha), 'dd/MM/yyyy')}: ${m.tipo} de $${m.monto} en "${m.descripcion}" (${m.categoria || 'Sin categoría'})`
  ).join('\n');

  // Calcular resumen rápido para el agente
  const totalIngresos = recentMovimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgresos = recentMovimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0);

  const groqMessages: any[] = [
    {
      role: "system",
      content: `Eres MoviBot PRO, el asistente financiero de élite de MoviTrack.
      
      PERSONALIDAD:
      - Eres un experto en finanzas personales, empático y motivador.
      - Hablas con calidez (español latino/rioplatense amigable).
      - Tu objetivo es que el usuario logre libertad financiera.
      
      CAPACIDADES QUE DEBES MENCIONAR:
      - El usuario puede filtrar por MES, AÑO y DÍA usando los selectores circulares superiores.
      - Puede descargar reportes en PDF (para ver el detalle visual) o en CSV (para Excel/Google Sheets).
      - Puede registrar movimientos rápidamente con el botón "+" flotante.
      
      ESTADÍSTICAS ACTUALES (Contexto):
      - Ingresos totales (últimos 50): $${totalIngresos.toLocaleString()}
      - Egresos totales (últimos 50): $${totalEgresos.toLocaleString()}
      - Balance neto: $${(totalIngresos - totalEgresos).toLocaleString()}
      
      HISTORIAL RECIENTE:
      ${context || "No hay movimientos registrados aún."}
      
      REGLAS DE ORO:
      1. Si el balance es negativo o los egresos son altos, sugiere reducir gastos hormiga.
      2. Si hay buenos ingresos, felicita al usuario y sugiere metas de ahorro.
      3. Siempre recuerda que el usuario tiene el control total desde los filtros del Dashboard.
      4. NUNCA inventes que puedes realizar cambios por tu cuenta; guía al usuario a usar la interfaz.`
    },
    ...messages
  ];

  const completion = await groq.chat.completions.create({
    messages: groqMessages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 800,
  });

  return c.json({ response: completion.choices[0]?.message?.content || "No pude procesar tu solicitud." });
});

const handle = (context: any) => app.fetch(context.request);

export const ALL: APIRoute = handle;
