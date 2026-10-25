import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { rows } from '../commerce/commerce.service';
import { trainingCommand } from './training.service';
import * as c from './nutrition.contracts';
import { foodCatalog } from './data/food-catalog';
const foodsById = new Map(foodCatalog.map((f) => [f.id, f]));

@Injectable()
export class NutritionService {
  constructor(private readonly database: DatabaseService) {}
  foods(input: z.infer<typeof c.foodQuery>) {
    const term = input.q.normalize('NFKC').toLocaleLowerCase();
    const matches = foodCatalog.filter((f) =>
      (f.nameEn + ' ' + (f.nameFa ?? ''))
        .normalize('NFKC')
        .toLocaleLowerCase()
        .includes(term),
    );
    return {
      items: matches.slice((input.page - 1) * 50, input.page * 50).map((f) => ({
        ...f,
        sourceUrl: `https://fdc.nal.usda.gov/food-details/${f.id}/nutrients`,
      })),
      total: matches.length,
      hasMore: matches.length > input.page * 50,
    };
  }
  addFood(actor: string, id: string, input: z.infer<typeof c.foodEntry>) {
    const food = foodsById.get(id);
    if (!food) throw new NotFoundException('Training.notFound');
    const { locale, ...rest } = input;
    return this.add(
      actor,
      c.entry.parse({
        ...rest,
        name: (locale === 'fa'
          ? (food.nameFa ?? food.nameEn)
          : food.nameEn
        ).slice(0, 160),
        per100g: food.per100g,
      }),
      {
        id: food.id,
        url: `https://fdc.nal.usda.gov/food-details/${food.id}/nutrients`,
      },
    );
  }
  async day(actor: string, date: string) {
    return this.database.db.transaction(
      async (tx) => {
        const [totals] = await rows<{
          calories: string;
          protein: string;
          carbs: string;
          fat: string;
          entries: number;
        }>(
          tx,
          sql`SELECT coalesce(sum(calories),0)::text calories,coalesce(sum(protein),0)::text protein,coalesce(sum(carbs),0)::text carbs,coalesce(sum(fat),0)::text fat,count(*)::int entries FROM nutrition_entries WHERE athlete_id=${actor} AND eaten_on=${date} AND NOT archived`,
        );
        const entries = await rows(
          tx,
          sql`SELECT id,eaten_on,meal,name,grams::text,per_100g,calories::text,protein::text,carbs::text,fat::text,revision,food_id,food_source_url FROM nutrition_entries WHERE athlete_id=${actor} AND eaten_on=${date} AND NOT archived ORDER BY created_at DESC,id LIMIT 100`,
        );
        return {
          date,
          totals,
          entries,
          hasMore: totals.entries > entries.length,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async add(
    actor: string,
    input: z.infer<typeof c.entry>,
    source?: { id: string; url: string },
  ) {
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['nutritionEntry', input, source ?? null],
      async (tx) => {
        const n = c.nutrients(input.grams, input.per100g);
        const [saved] = await rows(
          tx,
          sql`INSERT INTO nutrition_entries(athlete_id,eaten_on,meal,name,grams,per_100g,calories,protein,carbs,fat,food_id,food_source_url) VALUES(${actor},${input.eatenOn},${input.meal},${input.name},${input.grams},${JSON.stringify(input.per100g)}::jsonb,${n.calories},${n.protein},${n.carbs},${n.fat},${source?.id ?? null},${source?.url ?? null}) RETURNING id`,
        );
        return saved;
      },
    );
  }
  async remove(actor: string, id: string, input: z.infer<typeof c.remove>) {
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['removeNutrition', id, input],
      async (tx) => {
        const [row] = await rows<{ revision: number; archived: boolean }>(
          tx,
          sql`SELECT revision,archived FROM nutrition_entries WHERE id=${id} AND athlete_id=${actor} FOR UPDATE`,
        );
        if (!row) throw new NotFoundException('Training.notFound');
        if (!row.archived) {
          if (row.revision !== input.revision)
            throw new ConflictException('Training.conflict');
          await tx.execute(
            sql`UPDATE nutrition_entries SET archived=true,revision=revision+1 WHERE id=${id}`,
          );
        }
        return { id };
      },
    );
  }
}
