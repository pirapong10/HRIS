import { evaluate } from 'mathjs';
import { prisma } from '../prisma';
import { PAYROLL_FUNCTIONS } from './payrollFunctions';

export interface ComponentResult {
  code: string;
  amount: number;
  formulaUsed: string;
}

export interface EngineOutput {
  computed: Record<string, number>;
  results: ComponentResult[];
  gross: number;
  deductions: number;
  net: number;
}

/**
 * Run the payroll component engine for a single employee.
 *
 * @param baseVariables  - Variables from the employee record + attendance:
 *   { Salary, OTHours, LateMinutes, ... }
 *
 * Components are loaded from DB ordered by sortOrder ASC.
 * Each component's result is added to scope so later components can reference it.
 *
 * TaxableIncome is recomputed before each iteration as the sum of all
 * taxable earning components computed so far.
 */
export async function runPayrollEngine(
  baseVariables: Record<string, number>
): Promise<EngineOutput> {
  const components = await prisma.payrollComponent.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const computed: Record<string, number> = {};
  const results: ComponentResult[] = [];

  for (const comp of components) {
    // Build scope: base vars + everything computed so far
    const scope: Record<string, number> = { ...baseVariables, ...computed };

    // Recompute TaxableIncome before each component
    // = sum of all currently-computed earning components that are taxable
    scope.TaxableIncome = components
      .filter(c => c.isTaxable && c.type === 'earning' && computed[c.code] !== undefined)
      .reduce((sum, c) => sum + computed[c.code], 0);

    let amount: number;

    try {
      if (comp.calcMethod === 'function') {
        const fn = PAYROLL_FUNCTIONS[comp.functionName!];
        if (!fn) throw new Error(`Unknown function: "${comp.functionName}"`);
        console.log(`[Engine Debug] Calling ${comp.functionName} with scope.TaxableIncome:`, scope.TaxableIncome);
        amount = fn(scope);
      } else {
        // formula — inject convenience helpers into mathjs scope
        const mathScope: Record<string, any> = {
          ...scope,
          MIN: (a: number, b: number) => Math.min(a, b),
          MAX: (a: number, b: number) => Math.max(a, b),
          ROUND: (x: number) => Math.round(x),
        };
        amount = evaluate(comp.formula!, mathScope) as number;
      }
    } catch (err: any) {
      throw new Error(`Component "${comp.code}" calculation failed: ${err.message}`);
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error(`Component "${comp.code}" produced invalid result: ${amount}`);
    }

    computed[comp.code] = amount;
    results.push({
      code: comp.code,
      amount,
      formulaUsed: comp.formula || comp.functionName || '',
    });
  }

  const gross = components
    .filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + (computed[c.code] || 0), 0);

  const deductions = components
    .filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + (computed[c.code] || 0), 0);

  return { computed, results, gross, deductions, net: gross - deductions };
}

/**
 * Validate a formula without saving anything.
 * Used by the /test API endpoint.
 */
export function validateFormula(
  formula: string,
  dummyVars: Record<string, number>
): { valid: boolean; error?: string; result?: number } {
  try {
    const scope: Record<string, any> = {
      ...dummyVars,
      MIN: (a: number, b: number) => Math.min(a, b),
      MAX: (a: number, b: number) => Math.max(a, b),
      ROUND: (x: number) => Math.round(x),
    };
    const result = evaluate(formula, scope) as number;
    if (typeof result !== 'number' || isNaN(result)) {
      return { valid: false, error: 'Formula did not produce a valid number' };
    }
    return { valid: true, result };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
