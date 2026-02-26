import { prisma } from "@/lib/db";
import type { DomainWarmup } from "@prisma/client";

const BASE_SCHEDULE: Record<number, number> = {
  1: 50,
  2: 100,
  3: 200,
  4: 400,
  5: 750,
  6: 1000,
};

const RAMP_FACTOR = 1.5;

export function calculateWarmupTarget(warmup: DomainWarmup): number {
  const day = warmup.currentDay;

  if (BASE_SCHEDULE[day] !== undefined) {
    return Math.min(BASE_SCHEDULE[day], warmup.maxTarget);
  }

  const lastBase = BASE_SCHEDULE[6];
  const extraDays = day - 6;
  const target = Math.round(lastBase * Math.pow(RAMP_FACTOR, extraDays));

  return Math.min(target, warmup.maxTarget);
}

export async function advanceWarmupDay(warmupId: string): Promise<void> {
  const warmup = await prisma.domainWarmup.findUnique({
    where: { id: warmupId },
  });

  if (!warmup || !warmup.enabled) return;

  const nextDay = warmup.currentDay + 1;
  const updatedWarmup = { ...warmup, currentDay: nextDay };
  const newTarget = calculateWarmupTarget(updatedWarmup);

  const isComplete = newTarget >= warmup.maxTarget;

  await prisma.domainWarmup.update({
    where: { id: warmupId },
    data: {
      currentDay: nextDay,
      dailyTarget: newTarget,
      enabled: !isComplete,
    },
  });
}

export function getWarmupSchedule(maxTarget = 10000): Array<{ day: number; target: number }> {
  const schedule: Array<{ day: number; target: number }> = [];

  for (let day = 1; day <= 30; day++) {
    const warmup = {
      currentDay: day,
      maxTarget,
    } as DomainWarmup;

    const target = calculateWarmupTarget(warmup);
    schedule.push({ day, target });

    if (target >= maxTarget) break;
  }

  return schedule;
}
