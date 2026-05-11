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

  if (month && year) {
    if (day) {
      query = query.where(and(
        eq(sql`EXTRACT(DAY FROM ${movimientos.fecha})`, Number(day)),
        eq(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`, Number(month)),
        eq(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`, Number(year))
      ));
    } else {
      query = query.where(and(
        eq(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`, Number(month)),
        eq(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`, Number(year))
      ));
    }
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

  let whereClause = eq(movimientos.userId, user.id);

  if (month && year) {
    if (day) {
      whereClause = and(
        whereClause,
        eq(sql`EXTRACT(DAY FROM ${movimientos.fecha})`, Number(day)),
        eq(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`, Number(month)),
        eq(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`, Number(year))
      ) as any;
    } else {
      whereClause = and(
        whereClause,
        eq(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`, Number(month)),
        eq(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`, Number(year))
      ) as any;
    }
  }

  const result = await db.select({
    tipo: movimientos.tipo,
    total: sql<number>`sum(cast(${movimientos.monto} as numeric))`
  }).from(movimientos)
    .where(whereClause)
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

  const groqMessages: any[] = [
    {
      role: "system",
      content: `Eres MoviBot, el asistente financiero ultra-inteligente de MoviTrack.
      
      PERSONALIDAD:
      - Eres extremadamente empático, como un mentor financiero que realmente se preocupa por el éxito del usuario.
      - Hablas de forma natural, fluida y amigable (español rioplatense/latino cálido).
      - Si el usuario vendió mucho, ¡felicitalo con entusiasmo! Si gastó de más, dale un consejo constructivo sin juzgar.
      
      CONOCIMIENTO DE LA APP:
      - Sabes que el usuario puede filtrar por MES, AÑO e incluso por un DÍA específico usando los selectores en la parte superior del Dashboard.
      - Sabes que puede exportar reportes PDF detallados del periodo que está viendo.
      - Sabes que puede registrar nuevos movimientos con el botón "+" verde.
      
      REGLAS DE ORO:
      1. NUNCA inventes que podés modificar la base de datos. Si te piden "anotá esto", deciles que usen el botón "+" del Dashboard.
      2. Si te preguntan por un gasto o ingreso específico, buscalo en el contexto que te paso abajo.
      3. Sé proactivo: si ves una tendencia (ej. muchos gastos en comida), sugerí formas de ahorro.
      4. Si el usuario te pregunta por un día o mes, confirmale que puede usar los filtros del Dashboard para verlo con más detalle y exportarlo a PDF.

      DATOS REALES DEL USUARIO (Contexto):
      ${context || "El usuario aún no tiene movimientos registrados. ¡Invitalo a crear el primero!"}
      
      Usuario actual: ${user.name}`
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
