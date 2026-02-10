import type { Role } from '@int/schema';
import type { RoleBudgetWindow } from '../schema';
import { addDays, addMonths, startOfDay } from 'date-fns';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { roleBudgetWindows } from '../schema';

export type BudgetWindowPeriod = 'weekly' | 'monthly';

type BudgetWindowState = Pick<RoleBudgetWindow, 'windowStartAt' | 'nextResetAt'>;

const getNextResetAt = (period: BudgetWindowPeriod, previousResetAt: Date): Date => {
  return period === 'weekly' ? addDays(previousResetAt, 7) : addMonths(previousResetAt, 1);
};

const createInitialState = (period: BudgetWindowPeriod, now: Date): BudgetWindowState => {
  const windowStartAt = startOfDay(now);

  return {
    windowStartAt,
    nextResetAt: getNextResetAt(period, windowStartAt)
  };
};

const advanceState = (
  period: BudgetWindowPeriod,
  initialState: BudgetWindowState,
  now: Date
): BudgetWindowState => {
  let windowStartAt = initialState.windowStartAt;
  let nextResetAt = initialState.nextResetAt;

  while (now >= nextResetAt) {
    windowStartAt = nextResetAt;
    nextResetAt = getNextResetAt(period, windowStartAt);
  }

  return {
    windowStartAt,
    nextResetAt
  };
};

const isSameState = (left: BudgetWindowState, right: BudgetWindowState): boolean => {
  return (
    left.windowStartAt.getTime() === right.windowStartAt.getTime() &&
    left.nextResetAt.getTime() === right.nextResetAt.getTime()
  );
};

const findWindowRow = async (
  userId: string,
  role: Role,
  period: BudgetWindowPeriod
): Promise<RoleBudgetWindow | null> => {
  const result = await db
    .select()
    .from(roleBudgetWindows)
    .where(
      and(
        eq(roleBudgetWindows.userId, userId),
        eq(roleBudgetWindows.role, role),
        eq(roleBudgetWindows.period, period)
      )
    )
    .limit(1);

  return result[0] ?? null;
};

export const roleBudgetWindowRepository = {
  async getActiveWindow(
    userId: string,
    role: Role,
    period: BudgetWindowPeriod,
    now = new Date()
  ): Promise<BudgetWindowState> {
    let row = await findWindowRow(userId, role, period);

    if (!row) {
      const initialState = createInitialState(period, now);

      await db
        .insert(roleBudgetWindows)
        .values({
          userId,
          role,
          period,
          windowStartAt: initialState.windowStartAt,
          nextResetAt: initialState.nextResetAt,
          updatedAt: now
        })
        .onConflictDoNothing({
          target: [roleBudgetWindows.userId, roleBudgetWindows.role, roleBudgetWindows.period]
        });

      row = await findWindowRow(userId, role, period);

      if (!row) {
        return initialState;
      }
    }

    const currentState: BudgetWindowState = {
      windowStartAt: row.windowStartAt,
      nextResetAt: row.nextResetAt
    };
    const nextState = advanceState(period, currentState, now);

    if (!isSameState(currentState, nextState)) {
      await db
        .update(roleBudgetWindows)
        .set({
          windowStartAt: nextState.windowStartAt,
          nextResetAt: nextState.nextResetAt,
          updatedAt: now
        })
        .where(eq(roleBudgetWindows.id, row.id));
    }

    return nextState;
  }
};
