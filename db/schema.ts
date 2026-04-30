import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
});

export const movimientos = pgTable("movimientos", {
  id: uuid("id").primaryKey().defaultRandom(),
  fecha: timestamp("fecha").notNull().defaultNow(),
  tipo: text("tipo").notNull(), // 'ingreso' o 'egreso'
  descripcion: text("descripcion").notNull(),
  monto: numeric("monto").notNull(),
  categoriaId: uuid("categoria_id").references(() => categorias.id),
  medioPago: text("medio_pago"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
