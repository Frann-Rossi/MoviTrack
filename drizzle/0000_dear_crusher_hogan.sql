CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"tipo" text NOT NULL,
	"descripcion" text NOT NULL,
	"monto" numeric NOT NULL,
	"categoria_id" uuid,
	"medio_pago" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;