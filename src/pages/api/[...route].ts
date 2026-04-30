import { Hono } from 'hono';
import { logger } from 'hono/logger';
import Groq from 'groq-sdk';
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
  .where(eq(movimientos.userId, user.id))
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
  const result = await db.select({
    tipo: movimientos.tipo,
    total: sql<number>`sum(cast(${movimientos.monto} as numeric))`
  }).from(movimientos)
    .where(eq(movimientos.userId, user.id))
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
  .limit(30);

  const context = recentMovimientos.map(m => 
    `- ${m.fecha}: ${m.tipo} de $${m.monto} en "${m.descripcion}" (${m.categoria || 'Sin categoría'})`
  ).join('\n');

  const groqMessages: any[] = [
    {
      role: "system",
      content: `Eres MoviBot, el asistente financiero de MoviTrack. 
      Tu personalidad: Eres como un amigo humano con mucha empatía y experto en finanzas. Hablas de forma natural, cercana y muy conversacional (como en un chat de WhatsApp).
      
      REGLAS CRÍTICAS:
      1. Entiende que el usuario puede hacerte preguntas muy informales o vagas. Ayúdalo a entender sus finanzas sin usar palabras técnicas complicadas.
      2. Sé breve y conciso, pero siempre amable. No des respuestas gigantescas ni aburridas.
      3. Usa emojis con naturalidad.
      4. NUNCA digas que agregaste, registraste o modificaste un movimiento. Vos NO podés hacer cambios en la base de datos. Si el usuario te pide agregar un ingreso, egreso o cualquier movimiento, decile amablemente que use el botón "Nuevo Movimiento" (el botón verde con el símbolo +) que está arriba en el Dashboard.
      5. Tu rol es SOLO analizar datos existentes, dar consejos financieros y responder preguntas. NO podés crear, editar ni borrar movimientos.

      CONTEXTO DE MOVIMIENTOS RECIENTES DEL USUARIO:
      ${context || "No hay movimientos registrados aún."}
      
      El usuario puede descargar informes en PDF desde el botón "Exportar PDF" en el historial. Solo menciónalo si piden un informe.`
    },
    ...messages
  ];

  const completion = await groq.chat.completions.create({
    messages: groqMessages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 500,
  });

  return c.json({ response: completion.choices[0]?.message?.content || "No pude procesar tu solicitud." });
});

const handle = (context: any) => app.fetch(context.request);

export const ALL: APIRoute = handle;
