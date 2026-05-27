import { NextResponse } from "next/server";

export const runtime = "nodejs";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "phase", "venue", "employeesToAdd", "scheduleAction"],
  properties: {
    reply: { type: "string" },
    phase: {
      type: "string",
      enum: ["collecting", "review", "approved"]
    },
    venue: {
      type: "object",
      additionalProperties: false,
      required: ["name", "openDays", "normalOpen", "normalClose", "lateCloseDays", "lateCloseTime", "longShiftDays"],
      properties: {
        name: { type: "string" },
        openDays: { type: "array", items: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] } },
        normalOpen: { type: "string" },
        normalClose: { type: "string" },
        lateCloseDays: { type: "array", items: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] } },
        lateCloseTime: { type: "string" },
        longShiftDays: { type: "array", items: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] } }
      }
    },
    employeesToAdd: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "phone", "role", "employmentType", "weeklyHours", "maxHoursPerDay", "status", "acceptsSplitShift", "unavailableDays", "availability", "canOpen", "canClose", "canWorkLongShift"],
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", enum: ["sala", "cocina", "barra", "terraza", "encargado", "ayudante_cocina", "ayudante_camarero", "mantenimiento"] },
          employmentType: { type: "string", enum: ["fullTime", "partTime"] },
          weeklyHours: { type: "integer" },
          maxHoursPerDay: { type: "integer" },
          status: { type: "string", enum: ["active", "inactive", "temporary"] },
          acceptsSplitShift: { type: "boolean" },
          unavailableDays: { type: "array", items: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] } },
          availability: {
            type: "object",
            additionalProperties: false,
            required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            properties: {
              monday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              tuesday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              wednesday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              thursday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              friday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              saturday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } },
              sunday: { type: "array", items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "string" }, end: { type: "string" } } } }
            }
          },
          canOpen: { type: "boolean" },
          canClose: { type: "boolean" },
          canWorkLongShift: { type: "boolean" }
        }
      }
    },
    scheduleAction: { type: "string", enum: ["none", "generate", "regenerate", "approve"] }
  }
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta OPENROUTER_API_KEY en .env.local. Sin esa clave el chatbot no puede entender lenguaje natural." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "BASA Shift"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres BASA Shift, chatbot para duenos de bares. Entiende lenguaje natural en espanol, no inventes trabajadores, pide solo lo que falte, y devuelve JSON valido. Usa roles validos: sala, cocina, barra, terraza, encargado, ayudante_cocina, ayudante_camarero, mantenimiento. Mapea camarero a sala, ayudante de camarero a ayudante_camarero, cocinero a cocina, ayudante de cocina a ayudante_cocina, mantenimiento/limpieza/arreglos a mantenimiento. Extrae disponibilidad horaria de trabajadores cuando el usuario diga cosas como 'Ana solo puede martes de 12 a 16', 'Luis solo noches', 'Marta puede fines de semana'. Si no se indica disponibilidad, devuelve arrays vacios para cada dia. Si el usuario dice listo/genera y hay datos suficientes, scheduleAction generate. Si aprueba, approve."
        },
        {
          role: "user",
          content: JSON.stringify(body)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "basa_shift_chat",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: 500 });
  }

  const data = await response.json();
  const output = data.choices?.[0]?.message?.content;

  if (!output) {
    return NextResponse.json(
      { error: "OpenRouter no devolvio contenido." },
      { status: 500 }
    );
  }

  return NextResponse.json(JSON.parse(output));
}
