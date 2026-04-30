import { pgTable, text, timestamp, boolean, numeric, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
					id: text("id").primaryKey(),
					name: text('name').notNull(),
					email: text('email').notNull().unique(),
					emailVerified: boolean('emailVerified').notNull(),
					image: text('image'),
					createdAt: timestamp('createdAt').notNull(),
					updatedAt: timestamp('updatedAt').notNull()
});

export const session = pgTable("session", {
					id: text("id").primaryKey(),
					expiresAt: timestamp('expiresAt').notNull(),
					token: text('token').notNull().unique(),
					createdAt: timestamp('createdAt').notNull(),
					updatedAt: timestamp('updatedAt').notNull(),
					ipAddress: text('ipAddress'),
					userAgent: text('userAgent'),
					userId: text('userId').notNull().references(() => user.id)
});

export const account = pgTable("account", {
					id: text("id").primaryKey(),
					accountId: text('accountId').notNull(),
					providerId: text('providerId').notNull(),
					userId: text('userId').notNull().references(() => user.id),
					accessToken: text('accessToken'),
					refreshToken: text('refreshToken'),
					idToken: text('idToken'),
					accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
					refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
					scope: text('scope'),
					password: text('password'),
					createdAt: timestamp('createdAt').notNull(),
					updatedAt: timestamp('updatedAt').notNull()
});

export const verification = pgTable("verification", {
					id: text("id").primaryKey(),
					identifier: text('identifier').notNull(),
					value: text('value').notNull(),
					expiresAt: timestamp('expiresAt').notNull(),
					createdAt: timestamp('createdAt'),
					updatedAt: timestamp('updatedAt')
});

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
});

export const movimientos = pgTable("movimientos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id), // Vinculado al usuario
  fecha: timestamp("fecha").notNull().defaultNow(),
  tipo: text("tipo").notNull(), // 'ingreso' o 'egreso'
  descripcion: text("descripcion").notNull(),
  monto: numeric("monto").notNull(),
  categoriaId: uuid("categoria_id").references(() => categorias.id),
  medioPago: text("medio_pago"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
